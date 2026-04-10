import { STORAGE_KEYS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbarStore";
import { appStorage } from "@/stores/storage";
import { useUpdateStore } from "@/stores/updateStore";
import * as Application from "expo-application";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { NativeModules, Platform } from "react-native";

type CheckResponse = {
  updateAvailable: boolean;
  apkUrl?: string;
  latestVersion?: string;
  version?: string;
  releaseUrl?: string;
  name?: string;
  apk?: {
    url?: string;
  };
  forceUpdate?: boolean;
};

type UpdateCheckCache = {
  checkedAt: number;
  response: CheckResponse;
};

const UPDATE_CHECK_ENDPOINT = "https://sausico.pages.dev/update/check";
const CACHE_WINDOW_MS = 24 * 60 * 60 * 1000;
const APK_FILE_NAME = "sausico-update.apk";

let hasCheckedThisSession = false;

class UpdateService {
  async checkOnLaunch(): Promise<void> {
    if (Platform.OS !== "android") return;
    if (hasCheckedThisSession) return;

    hasCheckedThisSession = true;

    try {
      const cachedRaw = await appStorage.getItem(
        STORAGE_KEYS.UPDATE_CHECK_CACHE,
      );
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as UpdateCheckCache;
        if (Date.now() - cached.checkedAt < CACHE_WINDOW_MS) {
          this.handleCheckResponse(cached.response);
          return;
        }
      }
    } catch {
      // ignore
    }

    try {
      const payload = {
        version: this.getCurrentVersion(),
        arch: this.getDeviceArchitecture(),
      };

      const res = await fetch(UPDATE_CHECK_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Update check response:", res);

      if (!res.ok) return;

      const data = (await res.json()) as CheckResponse;

      await appStorage.setItem(
        STORAGE_KEYS.UPDATE_CHECK_CACHE,
        JSON.stringify({
          checkedAt: Date.now(),
          response: data,
        } satisfies UpdateCheckCache),
      );

      this.handleCheckResponse(data);
    } catch {
      // fail silently
    }
  }

  async startDownloadAndInstall(): Promise<void> {
    const { apkUrl } = useUpdateStore.getState();
    if (!apkUrl) return;

    const updateStore = useUpdateStore.getState();
    updateStore.setError(null);
    updateStore.setProgress(0);
    updateStore.setDownloadState("downloading");

    try {
      const destination = new File(Paths.document, APK_FILE_NAME);

      const apkFile = await File.downloadFileAsync(apkUrl, destination, {
        idempotent: true,
        headers: {
          "User-Agent": `Sausico/${this.getCurrentVersion()}`,
        },
      });

      useUpdateStore.getState().setProgress(1);

      await appStorage.setItem(STORAGE_KEYS.UPDATE_APK_URI, apkFile.uri);

      useUpdateStore.getState().setDownloadState("installing");
      let installLaunched = false;
      await this.installDownloadedApk(apkFile.uri);
      installLaunched = true;

      if (installLaunched) {
        useUpdateStore.getState().completeFlow();
      }
    } catch {
      useUpdateStore.getState().setDownloadState("download-failed");
      useUpdateStore.getState().setError("Could not download update.");

      useSnackbarStore.getState().show({
        message: "Update download failed. Tap retry.",
        variant: "warning",
        actionLabel: "Retry",
        onAction: () => {
          void this.startDownloadAndInstall();
        },
      });
    }
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

  private getCurrentVersion(): string {
    return (
      Application.nativeApplicationVersion ??
      Application.nativeBuildVersion ??
      "0.0.0"
    );
  }

  private getDeviceArchitecture(): string {
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

  private async installDownloadedApk(apkUri: string): Promise<void> {
    const file = new File(apkUri);

    const contentUri = await file.contentUri;

    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: "application/vnd.android.package-archive",
      flags: 1,
    });
  }
}

export const updateService = new UpdateService();
