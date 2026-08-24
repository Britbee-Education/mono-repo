import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { AppState, Text, TextInput, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { ProgressProvider } from "@/context/ProgressContext";
import { NotifyProvider } from "@/context/NotifyContext";
import { HiveProvider } from "@/context/HiveContext";
import { SocialProvider } from "@/context/SocialContext";
import { ParentProvider } from "@/context/ParentContext";
import { CelebrationHost } from "@/components/game/Celebration";
import { ClaimHost } from "@/components/game/ClaimHost";
import { BeeStateScreen } from "@/components/ui/BeeStateScreen";
import { WebCanvas } from "@/components/ui/WebCanvas";
import { API_URL, colors } from "@/constants/theme";
import { prefetchSpeech } from "@/lib/speech";
import { preloadSfx } from "@/lib/sfx";

const regularTypography = {
  fontFamily: "SatoshiRegular",
  fontWeight: "400" as const,
};

const webInputReset = {
  outlineStyle: "none" as const,
  outlineWidth: 0,
  outlineColor: "transparent",
};

(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = [regularTypography, (Text as any).defaultProps.style].filter(Boolean);

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = [regularTypography, webInputReset, (TextInput as any).defaultProps.style].filter(Boolean);

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => undefined);

    const atSplash = segments.length === 0 || segments[0] === "index";
    const inAuth = segments[0] === "(auth)";
    const inMain = segments[0] === "(main)";
    const inActivity = segments[0] === "activity";
    const inClass = segments[0] === "class";
    const inSocial = segments[0] === "social";
    const inAvatar = segments[0] === "avatar";
    const inParent = segments[0] === "parent";
    const authScreen = String(segments[1] || "");
    const inOnboarding =
      inAuth && ["signup", "otp", "password"].includes(authScreen);

    // Let the branded splash hold, then index.tsx routes onward.
    if (atSplash) return;

    if (user) {
      const needsPassword = user.hasPassword === false;
      const needsChild = !user.child?.childName;
      if (needsPassword) {
        if (authScreen !== "password") {
          router.replace("/(auth)/password");
        }
        return;
      }
      if (needsChild && !inOnboarding) {
        router.replace("/(auth)/signup/child");
        return;
      }
      if (!needsChild && !inMain && !inActivity && !inClass && !inSocial && !inAvatar && !inParent) {
        router.replace("/(main)");
      }
      return;
    }
    if (!inAuth) {
      router.replace("/(auth)/login");
    }
  }, [user, loading, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
        animationDuration: 180,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ animation: "fade", animationDuration: 180 }} />
      <Stack.Screen name="(main)" options={{ animation: "fade", animationDuration: 180 }} />
      <Stack.Screen name="activity" options={{ animation: "slide_from_right", animationDuration: 220 }} />
      <Stack.Screen name="class" options={{ animation: "slide_from_right", animationDuration: 220 }} />
      <Stack.Screen name="social" options={{ animation: "slide_from_right", animationDuration: 220 }} />
      <Stack.Screen name="avatar" options={{ animation: "slide_from_right", animationDuration: 220 }} />
      <Stack.Screen name="parent" options={{ animation: "slide_from_right", animationDuration: 220 }} />
    </Stack>
  );
}

/** Health URLs to try — primary API first, then localhost fallback for web/dev. */
function healthCandidates() {
  const urls = [API_URL];
  try {
    const primary = new URL(API_URL.includes("://") ? API_URL : `http://${API_URL}`);
    if (primary.hostname !== "localhost" && primary.hostname !== "127.0.0.1") {
      urls.push(`http://localhost:${primary.port || "3001"}`);
    }
  } catch {
    urls.push("http://localhost:3001");
  }
  return [...new Set(urls)];
}

async function pingHealth(base: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2800);
  try {
    const res = await fetch(`${base}/health?_=${Date.now()}`, {
      method: "GET",
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function NetworkGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const bases = healthCandidates();
      let ok = false;
      for (const base of bases) {
        ok = await pingHealth(base);
        if (ok) break;
      }
      setOffline(!ok);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const t = setInterval(() => void checkHealth(), 12000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void checkHealth();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [checkHealth]);

  if (offline) {
    return (
      <BeeStateScreen
        mood="cheer"
        bubble="No internet right now"
        title="Connection Paused"
        message="Your hive can’t reach the BritBee server. Check Wi-Fi, make sure the API is running, then tap Try Again."
        primaryLabel={checking ? "Checking..." : "Try Again"}
        onPrimary={() => void checkHealth()}
        secondaryLabel="Back to welcome"
        onSecondary={() => router.replace("/(auth)/welcome")}
      />
    );
  }
  return <>{children}</>;
}

export function ErrorBoundary({ retry }: { error: Error; retry: () => void }) {
  const router = useRouter();
  return (
    <BeeStateScreen
      mood="wink"
      bubble="Oops, that page got sticky honey!"
      title="Something Went Wrong"
      message="No worries. Let’s jump back in and keep your learning streak buzzing."
      primaryLabel="Try Again"
      onPrimary={retry}
      secondaryLabel="Go to Home"
      onSecondary={() => router.replace("/(main)")}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SatoshiLight: require("../assets/fonts/Satoshi-Light.otf"),
    SatoshiRegular: require("../assets/fonts/Satoshi-Regular.otf"),
    SatoshiMedium: require("../assets/fonts/Satoshi-Medium.otf"),
    SatoshiBold: require("../assets/fonts/Satoshi-Bold.otf"),
    SatoshiBlack: require("../assets/fonts/Satoshi-Black.otf"),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
    <AuthProvider>
      <OnboardingProvider>
        <ProgressProvider>
          <NotifyProvider>
            <HiveProvider>
            <SocialProvider>
            <ParentProvider>
            <View style={{ flex: 1 }}>
              <SpeechWarmup />
              <StatusBar style="dark" />
              <WebCanvas>
                <NetworkGate>
                  <RootNavigator />
                  <CelebrationHost />
                  <ClaimHost />
                </NetworkGate>
              </WebCanvas>
            </View>
            </ParentProvider>
            </SocialProvider>
            </HiveProvider>
          </NotifyProvider>
        </ProgressProvider>
      </OnboardingProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}

function SpeechWarmup() {
  useEffect(() => {
    prefetchSpeech();
    void preloadSfx();
  }, []);
  return null;
}
