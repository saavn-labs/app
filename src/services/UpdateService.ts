import { STORAGE_KEYS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbarStore";
import { appStorage } from "@/stores/storage";
import { useUpdateStore } from "@/stores/updateStore";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { NativeModules, Platform } from "react-native";
import RNFetchBlob from "react-native-blob-util";

type CheckResponse = {
  updateAvailable: boolean;
  apkUrl?: string;
  latestVersion?: string;
  version?: string;
  releaseUrl?: string;
  name?: string;
  apk?: { url?: string };
  forceUpdate?: boolean;
};

type UpdateCheckCache = {
  checkedAt: number;
  response: CheckResponse;
};

const UPDATE_CHECK_ENDPOINT = "https://sausico.pages.dev/update/check";
const CACHE_WINDOW_MS = 24 * 60 * 60 * 1000;

let hasCheckedThisSession = false;

class UpdateService {
  async checkOnLaunch(): Promise<void> {
    if (Platform.OS !== "android") return;
    if (hasCheckedThisSession) return;

    hasCheckedThisSession = true;

    try {
      const cachedRaw = await appStorage.getItem(
        STORAGE_KEYS.UPDATE_CHECK_CACHE
      );

      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as UpdateCheckCache;

        if (Date.now() - cached.checkedAt < CACHE_WINDOW_MS) {
          this.handleCheckResponse(cached.response);
          return;
        }
      }
    } catch {}

    try {
      const payload = {
        version: this.getCurrentVersion(),
        arch: this.getDeviceArchitecture(),
      };

      const res = await fetch(UPDATE_CHECK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return;

      const data = (await res.json()) as CheckResponse;

      await appStorage.setItem(
        STORAGE_KEYS.UPDATE_CHECK_CACHE,
        JSON.stringify({
          checkedAt: Date.now(),
          response: data,
        })
      );

      this.handleCheckResponse(data);
    } catch {}
  }

  private handleCheckResponse(response: CheckResponse): void {
    if (!response.updateAvailable) return;

    const apkUrl = response.apkUrl ?? response.apk?.url;
    const latestVersion = response.latestVersion ?? response.version;

    if (!apkUrl) return;

    useUpdateStore.getState().showUpdate({
      latestVersion,
      apkUrl,
      releaseName: response.name,
      releaseUrl: response.releaseUrl,
      forceUpdate: Boolean(response.forceUpdate),
    });
  }

  async startDownloadAndInstall(): Promise<void> {
    if (Platform.OS !== "android") return;

    const { apkUrl } = useUpdateStore.getState();
    if (!apkUrl) return;

    const updateStore = useUpdateStore.getState();

    updateStore.setError(null);
    updateStore.setProgress(0);
    updateStore.setDownloadState("downloading");

    try {
      const { config, fs } = RNFetchBlob;

      const path = `${fs.dirs.DownloadDir}/app-update.apk`;

      const res = await config({
        fileCache: true,
        path,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: "Downloading update",
          description: "App update in progress...",
          mime: "application/vnd.android.package-archive",
          mediaScannable: true,
          path,
        },
      }).fetch("GET", apkUrl);

      const apkPath = res.path();

      updateStore.setProgress(1);
      updateStore.setDownloadState("installing");

      await appStorage.setItem(STORAGE_KEYS.UPDATE_APK_URI, apkPath);

      await this.installApk(apkPath);

      updateStore.completeFlow();
    } catch (err) {
      console.error("Update failed:", err);

      updateStore.setDownloadState("download-failed");
      updateStore.setError("Could not download update.");

      useSnackbarStore.getState().show({
        message: "Update download failed. Tap retry.",
        variant: "warning",
        actionLabel: "Retry",
        onAction: () => {
          this.startDownloadAndInstall();
        },
      });
    }
  }

  private async installApk(apkPath: string): Promise<void> {
    try {
      const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;
      const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

      await IntentLauncher.startActivityAsync(
        "android.intent.action.VIEW",
        {
          data: `file://${apkPath}`,
          type: "application/vnd.android.package-archive",
          flags:
            FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
        }
      );
    } catch (err) {
      console.error("Install failed:", err);

      useSnackbarStore.getState().show({
        message: "Please enable 'Install unknown apps' permission",
        variant: "warning",
      });
    }
  }

  getCurrentVersion(): string {
    return (
      Application.nativeApplicationVersion ??
      Application.nativeBuildVersion ??
      "0.0.0"
    );
  }

  getDeviceArchitecture(): string {
    if (Platform.OS !== "android") return "arm64-v8a";

    const platformConstants = Platform.constants as
      | { SupportedAbis?: string[] }
      | undefined;

    const nativeSupportedAbis = (
      NativeModules.PlatformConstants as
        | { SupportedAbis?: string[] }
        | undefined
    )?.SupportedAbis;

    const supportedAbis =
      platformConstants?.SupportedAbis ?? nativeSupportedAbis ?? [];

    return supportedAbis[0] ?? "arm64-v8a";
  }
}

export const updateService = new UpdateService();