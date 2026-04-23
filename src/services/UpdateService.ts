import { STORAGE_KEYS } from "@/constants";
import { useSnackbarStore } from "@/stores/snackbarStore";
import { appStorage } from "@/stores/storage";
import { useUpdateStore } from "@/stores/updateStore";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { NativeModules, Platform } from "react-native";
import RNFetchBlob from "react-native-blob-util";

class UpdateService {
  async startDownloadAndInstall(apkUrl: string): Promise<void> {
    if (Platform.OS !== "android") return;

    const updateStore = useUpdateStore.getState();

    updateStore.setError(null);
    updateStore.setProgress(0);
    updateStore.setDownloadState("downloading");

    try {
      const { config, fs } = RNFetchBlob;

      const path = `${fs.dirs.DownloadDir}/app-update.apk`;

      // 🚀 Use DownloadManager (system handles progress + notification)
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

      // Since DownloadManager handles UI, just mark as installing
      updateStore.setProgress(1);
      updateStore.setDownloadState("installing");

      await appStorage.setItem(STORAGE_KEYS.UPDATE_APK_URI, apkPath);

      await this.installApk(apkPath);

      updateStore.completeFlow();
    } catch (err) {
      console.error("Update failed:", err);

      updateStore.setDownloadState("download-failed");
      updateStore.setError("Update failed");

      useSnackbarStore.getState().show({
        message: "Update failed. Tap retry.",
        variant: "warning",
        actionLabel: "Retry",
        onAction: () => {
          this.startDownloadAndInstall(apkUrl);
        },
      });
    }
  }

  private async installApk(apkPath: string): Promise<void> {
    try {
      // ⚠️ Using raw flags (works reliably across setups)
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