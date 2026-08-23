import { useCallback, useEffect } from "react";
import { BackHandler, Platform, Pressable, StyleSheet } from "react-native";
import { useRootNavigationState, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

type NavState = {
  index?: number;
  routes?: Array<{ name?: string; state?: NavState }>;
};

function stackCanPop(state: NavState | undefined): boolean {
  if (!state || typeof state.index !== "number" || !Array.isArray(state.routes)) return false;
  if (state.index > 0) {
    const prev = state.routes[state.index - 1];
    // Splash (`index`) is always replaced; popping to it looks like a broken back.
    if (prev?.name === "index") return stackCanPop(state.routes[state.index]?.state);
    return true;
  }
  return stackCanPop(state.routes[state.index]?.state);
}

export function useAndroidBack(handler: () => void) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handler();
      return true;
    });
    return () => sub.remove();
  }, [handler]);
}

/** Go back if this session has a screen to pop; otherwise replace with a known route. Never throws. */
export function useSafeBack(fallback: Href = "/(main)") {
  const router = useRouter();
  const rootState = useRootNavigationState();

  return useCallback(() => {
    const hasStack = stackCanPop(rootState as NavState | undefined);
    if (hasStack) {
      try {
        router.back();
        return;
      } catch {
        /* web History API / empty expo stack */
      }
    }
    try {
      router.replace(fallback);
    } catch {
      try {
        router.navigate(fallback);
      } catch {
        /* nowhere left to go */
      }
    }
  }, [fallback, rootState, router]);
}

export function BackButton({
  fallback = "/(main)",
  color = colors.navy,
  onPress,
}: {
  fallback?: Href;
  color?: string;
  onPress?: () => void | Promise<void>;
}) {
  const go = useSafeBack(fallback);
  const handle = useCallback(() => {
    void (onPress ?? go)();
  }, [go, onPress]);
  useAndroidBack(handle);
  return (
    <Pressable
      onPress={handle}
      hitSlop={14}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
});
