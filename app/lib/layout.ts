import { Platform, useWindowDimensions } from "react-native";

export type Breakpoint = "phone" | "tablet" | "laptop" | "desktop";

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const web = Platform.OS === "web";
  const bp: Breakpoint = width < 640 ? "phone" : width < 1024 ? "tablet" : width < 1280 ? "laptop" : "desktop";
  const framed = web && width >= 720;
  const canvasMax =
    bp === "phone"
      ? width
      : bp === "tablet"
        ? Math.min(740, width - 24)
        : bp === "laptop"
          ? Math.min(880, width - 40)
          : Math.min(1040, width - 64);
  const stagePad = framed && height >= 720 ? 18 : framed ? 8 : 0;
  const headerTop = web ? (framed ? 16 : 24) : 52;
  const padX = bp === "phone" ? 20 : bp === "tablet" ? 28 : 36;
  const formMax = Math.min(460, canvasMax - padX * 2);
  const activityMax = Math.min(680, canvasMax);
  const split = web && width >= 960;
  const cols = width >= 1100 ? 5 : width >= 820 ? 4 : 3;
  const short = height < 640;

  return {
    width,
    height,
    bp,
    web,
    framed,
    canvasMax,
    stagePad,
    headerTop,
    padX,
    formMax,
    activityMax,
    split,
    cols,
    short,
  };
}
