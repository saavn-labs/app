import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 60;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "rgba(18, 18, 18, 0.95)",
            height: TAB_BAR_HEIGHT + insets.bottom,
            borderTopWidth: 0,
            paddingTop: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingHorizontal: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "#b3b3b3",
          tabBarItemStyle: {
            paddingTop: 4,
            paddingBottom: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 4,
            letterSpacing: 0.2,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "home-variant" : "home-variant-outline"}
                color={color}
                size={28}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "magnify" : "magnify"}
                color={color}
                size={28}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "bookshelf" : "bookshelf"}
                color={color}
                size={28}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? "history" : "history"}
                color={color}
                size={28}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121212",
  },
});
