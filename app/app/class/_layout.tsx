import { Stack } from "expo-router";
import { colors } from "@/constants/theme";

export default function ClassLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
        animationDuration: 160,
      }}
    />
  );
}
