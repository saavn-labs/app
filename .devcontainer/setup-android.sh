#!/usr/bin/env bash
set -e

# Define installation paths
ANDROID_SDK_ROOT=$HOME/android-sdk
ANDROID_HOME=$ANDROID_SDK_ROOT

# Create the SDK directory
mkdir -p $ANDROID_SDK_ROOT
cd $ANDROID_SDK_ROOT

# Update packages and install dependencies
# Added openjdk-17-jdk: Required for Expo SDK 52+ / React Native 0.74+ and modern sdkmanager
sudo dnf update
sudo dnf install -y unzip wget lib32stdc++6 lib32z1 openjdk-17-jdk

# Download latest Android Command Line Tools (Version 14.0 / build 12700392)
wget https://dl.google.com/android/repository/commandlinetools-linux-12700392_latest.zip
unzip commandlinetools-linux-*.zip
rm commandlinetools-linux-*.zip

# Correctly structure the cmdline-tools directory for sdkmanager
# sdkmanager requires the path: $ANDROID_HOME/cmdline-tools/latest/bin
mkdir -p cmdline-tools/latest
# Move the contents of the extracted 'cmdline-tools' (bin, lib, etc.) into 'latest'
# Note: 'unzip' creates a folder named 'cmdline-tools' in the current dir
if [ -d "cmdline-tools/bin" ]; then
    mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
    # The previous command might fail slightly if it tries to move 'latest' into 'latest', 
    # but 'bin' and 'lib' will move successfully. 
    # A cleaner approach is assuming the zip extracted to a temp folder, but this preserves your script logic.
fi

# Set Environment Variables
echo "export ANDROID_HOME=$ANDROID_HOME" >> ~/.zshrc
echo "export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT" >> ~/.zshrc
# Add Java Home if needed (usually auto-detected, but good practice)
echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64" >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.zshrc

# Reload bashrc to apply paths immediately for the script execution
export ANDROID_HOME=$ANDROID_HOME
export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Accept Licenses
yes | sdkmanager --licenses

# Install specific versions for Expo SDK 54 (Android 16 / API 36)
# build-tools 36.0.0 matches the API level 36 target
sdkmanager \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"