import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ScreenDecor } from "@/components/ui/ScreenDecor";
import { colors, fonts } from "@/constants/theme";

function HiveLoader() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.loader}>
      {[0, 1, 2].map((i) => {
        const opacity = pulse.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: i === 0 ? [1, 0.35, 1] : i === 1 ? [0.45, 1, 0.45] : [0.3, 0.55, 1],
        });
        const scale = pulse.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: i === 1 ? [0.85, 1.18, 0.85] : [1, 0.9, 1],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === 1 ? colors.navy : colors.yellow, opacity, transform: [{ scale }] },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function SplashIndex() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (user) {
        if (user.hasPassword === false) {
          router.replace("/(auth)/password");
        } else {
          router.replace(user.child?.childName ? "/(main)" : "/(auth)/signup/child");
        }
      } else {
        router.replace("/(auth)/login");
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <View style={styles.screen}>
      <ScreenDecor />
      <View style={styles.center}>
        <BrandLogo size="lg" />
      </View>
      <View style={styles.bottom}>
        <HiveLoader />
        <Text style={styles.sub}>Getting the hive ready…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: "22%", alignItems: "center" },
  loader: { flexDirection: "row", alignItems: "center", gap: 10, height: 36 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  sub: { marginTop: 12, fontFamily: fonts.semi, fontSize: 14, color: colors.navy },
});
