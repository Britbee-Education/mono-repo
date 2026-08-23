import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Keyboard overlap in px. Android uses adjustResize — window already shrinks, so height stays 0. */
export function useKeyboardHeight(enabled = true) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setHeight(0);
      return;
    }

    const onShow = (e: { endCoordinates: { height: number; screenY: number } }) => {
      if (Platform.OS === "android") {
        setHeight(0);
        return;
      }
      setHeight(Math.max(0, Math.round(e.endCoordinates.height)));
    };
    const onHide = () => setHeight(0);

    const subs =
      Platform.OS === "web"
        ? []
        : [
            Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", onShow),
            Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", onHide),
          ];

    let webCleanup: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const sync = () => {
        const vv = window.visualViewport;
        if (!vv) {
          setHeight(0);
          return;
        }
        const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setHeight(Math.round(overlap));
      };
      const onBlur = () => window.setTimeout(() => setHeight(0), 160);
      sync();
      window.visualViewport?.addEventListener("resize", sync);
      window.visualViewport?.addEventListener("scroll", sync);
      window.addEventListener("focusin", sync);
      window.addEventListener("focusout", onBlur);
      webCleanup = () => {
        window.visualViewport?.removeEventListener("resize", sync);
        window.visualViewport?.removeEventListener("scroll", sync);
        window.removeEventListener("focusin", sync);
        window.removeEventListener("focusout", onBlur);
      };
    }

    return () => {
      subs.forEach((s) => s.remove());
      webCleanup?.();
    };
  }, [enabled]);

  return height;
}
