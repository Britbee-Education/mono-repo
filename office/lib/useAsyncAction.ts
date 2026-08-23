"use client";

import { useCallback, useState } from "react";
import { toast } from "@/lib/toast";

export function useAsyncAction() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, fn: () => Promise<void>, successMsg?: string) => {
      setBusy(key);
      try {
        await fn();
        if (successMsg) toast(successMsg, "success");
      } catch (e: unknown) {
        toast(e instanceof Error ? e.message : "Something went wrong.", "error");
        throw e;
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return { busy, run, isBusy: (key: string) => busy === key };
}
