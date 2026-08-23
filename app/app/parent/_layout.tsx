import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F4F6FB" },
        animation: "fade",
        animationDuration: 160,
      }}
    />
  );
}
