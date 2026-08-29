import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AccountingProvider } from "@/lib/accounting/accounting-context";
import { ThemeProvider } from "@/lib/theme-provider";
import "@/lib/_core/nativewind-pressable";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  return <ThemeProvider><SafeAreaProvider><AccountingProvider><GestureHandlerRootView style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /></Stack><StatusBar style="dark" backgroundColor="#F7F8F8" translucent /></GestureHandlerRootView></AccountingProvider></SafeAreaProvider></ThemeProvider>;
}
