"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { subscribeToasts, type ToastItem, type ToastKind } from "@/lib/toast";

const ICON: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  error: XCircle,
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((item) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((list) => [...list, { ...item, id }]);
      window.setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== id));
      }, 3200);
    });
  }, []);

  if (!items.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {items.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id} className={`toast toast-${t.kind} toast-enter`} role="status">
            <Icon size={16} aria-hidden="true" className="toast-icon" />
            <span className="toast-msg">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
