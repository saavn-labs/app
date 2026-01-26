import CompactPlayer from "@/components/player/CompactPlayer";
import FullPlayer from "@/components/player/FullPlayer";
import { useUIStore } from "@/stores/uiStore";
import { sizes } from "@/utils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  const { isFullPlayerVisible, setFullPlayerVisible } = useUIStore();

  return (
    <View style={styles.root}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#121212",
            height: sizes.tabBarHeight,
            paddingBottom: 0,
            borderTopWidth: 0,
            elevation: 8,
          },
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "#b3b3b3",
          tabBarItemStyle: {
            paddingVertical: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "home-variant" : "home-variant-outline"}
                color={color}
                size={30}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="magnify" color={color} size={30} />
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="bookshelf"
                color={color}
                size={30}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="downloads"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="download" color={color} size={30} />
            ),
          }}
        />
      </Tabs>

      <CompactPlayer
        onPress={() => setFullPlayerVisible(true)}
        style={styles.compactPlayerOffset}
      />

      <FullPlayer
        visible={isFullPlayerVisible}
        onClose={() => setFullPlayerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121212",
  },
  compactPlayerOffset: {
    position: "absolute",
    bottom: sizes.tabBarHeight + 8,
    left: 8,
    right: 8,
    zIndex: 1000,
    elevation: 10,
  },
});
