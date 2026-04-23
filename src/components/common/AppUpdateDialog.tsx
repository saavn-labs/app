import { updateService } from "@/services/UpdateService";
import { useUpdateStore } from "@/stores/updateStore";
import React from "react";
import { Linking, View } from "react-native";
import { Button, Dialog, Portal, ProgressBar, Text } from "react-native-paper";

const AppUpdateDialog: React.FC = () => {
  const {
    visible,
    forceUpdate,
    latestVersion,
    releaseName,
    releaseUrl,
    downloadState,
    progress,
    error,
    hideUpdate,
  } = useUpdateStore();

  const isBusy =
    downloadState === "downloading" || downloadState === "installing";
  const statusMessage =
    downloadState === "installing"
      ? "Opening the Android installer..."
      : forceUpdate
        ? "This update is required to continue."
        : "You can update now for the latest fixes and improvements.";

  return (
    <Portal>
      <Dialog
        visible={visible}
        dismissable={!forceUpdate && !isBusy}
        onDismiss={hideUpdate}
        style={{ borderRadius: 24 }}
      >
        <Dialog.Title>Update Available</Dialog.Title>
        <Dialog.Content>
          <Text>
            {latestVersion
              ? `Version ${latestVersion} is available.`
              : "A newer version is available."}
          </Text>
          {releaseName ? <Text>{releaseName}</Text> : null}
          <Text>{statusMessage}</Text>

          {(downloadState === "downloading" ||
            downloadState === "installing") && (
            <View style={{ marginTop: 12 }}>
              <ProgressBar progress={progress} />
            </View>
          )}

          {error ? (
            <Text style={{ marginTop: 12, color: "#F44336" }}>{error}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          {releaseUrl && !isBusy ? (
            <Button
              onPress={() => {
                void Linking.openURL(releaseUrl);
              }}
            >
              View Notes
            </Button>
          ) : null}
          {!forceUpdate && !isBusy ? (
            <Button onPress={hideUpdate}>Later</Button>
          ) : null}
          <Button
            mode="contained"
            disabled={isBusy}
            onPress={() => {
              void updateService.startDownloadAndInstall(releaseUrl!);
            }}
          >
            {downloadState === "download-failed" ? "Retry" : "Update"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default AppUpdateDialog;
