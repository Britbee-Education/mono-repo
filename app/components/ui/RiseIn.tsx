import { useEffect, useState } from "react";
import { AccessibilityInfo, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { enterDown } from "@/lib/motion";

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export function RiseIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  if (reduce) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View entering={enterDown(delay)} style={style}>
      {children}
    </Animated.View>
  );
}
