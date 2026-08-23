import { Platform, Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { playSfx, type SfxName } from "@/lib/sfx";
import { pressDown, pressUp } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BouncePress({
  children,
  onPress,
  disabled,
  style,
  sound = "tap",
  accessibilityRole,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  sound?: SfxName | false;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onHoverIn={() => {
        if (disabled || Platform.OS !== "web") return;
        scale.value = pressDown(1.015);
      }}
      onHoverOut={() => {
        if (Platform.OS !== "web") return;
        scale.value = pressUp();
      }}
      onPressIn={() => {
        scale.value = pressDown(0.97);
        if (sound) playSfx(sound);
      }}
      onPressOut={() => {
        scale.value = pressUp();
      }}
      onPress={onPress}
      style={[style, anim, Platform.OS === "web" ? ({ cursor: disabled ? "default" : "pointer" } as ViewStyle) : null]}
    >
      {children}
    </AnimatedPressable>
  );
}
