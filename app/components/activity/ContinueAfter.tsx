import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useProgress } from "@/context/ProgressContext";
import { continueHref } from "@/lib/quests";

/** After Finish + collecting Buzz Points, jump to the next activity (or home). */
export function ContinueAfter({
  active,
  prepare,
}: {
  active: boolean;
  prepare?: () => void;
}) {
  const router = useRouter();
  const { pendingClaim, snapshot, track } = useProgress();
  const prepared = useRef(false);
  const sent = useRef(false);
  const prepareRef = useRef(prepare);
  prepareRef.current = prepare;
  const [ready, setReady] = useState(!prepare);

  useEffect(() => {
    if (!active || prepared.current) return;
    prepared.current = true;
    prepareRef.current?.();
    setReady(true);
  }, [active]);

  useEffect(() => {
    if (!active || !ready || sent.current) return;
    if (pendingClaim) return;
    sent.current = true;
    router.replace(continueHref(snapshot, track) as never);
  }, [active, ready, pendingClaim, snapshot, track, router]);

  return null;
}
