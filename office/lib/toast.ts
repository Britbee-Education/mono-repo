export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
};

const EVENT = "britbee:toast";

export function toast(message: string, kind: ToastKind = "info") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, kind } }));
}

export function subscribeToasts(onToast: (item: Omit<ToastItem, "id">) => void) {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ message?: string; kind?: ToastKind }>).detail;
    if (!detail?.message) return;
    onToast({ message: detail.message, kind: detail.kind || "info" });
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
