import { Easing, FadeIn, FadeInDown, withSpring, withTiming, type WithSpringConfig } from "react-native-reanimated";

/** Short timings — UI thread only, transform/opacity. */
export const motion = {
  tap: { duration: 70, easing: Easing.out(Easing.quad) },
  quick: { duration: 140, easing: Easing.out(Easing.cubic) },
  enter: { duration: 200, easing: Easing.out(Easing.cubic) },
  spring: { damping: 22, stiffness: 520, mass: 0.32 } satisfies WithSpringConfig,
};

export function pressDown(to = 0.97) {
  "worklet";
  return withTiming(to, motion.tap);
}

export function pressUp() {
  "worklet";
  return withSpring(1, motion.spring);
}

export function enterDown(delay = 0) {
  return FadeInDown.delay(delay).duration(200).easing(Easing.out(Easing.cubic));
}

export function enterFade(delay = 0) {
  return FadeIn.delay(delay).duration(160);
}

export { withTiming, withSpring };
