import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { msUntilNextIstMidnight } from "@/lib/day";

/** Live countdown to the next IST midnight — refreshes every 30s. */
export function useIstDayCountdown(tickMs = 30_000) {
  const [ms, setMs] = useState(() => msUntilNextIstMidnight());

  useEffect(() => {
    const tick = () => setMs(msUntilNextIstMidnight());
    tick();
    const id = setInterval(tick, tickMs);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [tickMs]);

  return ms;
}
