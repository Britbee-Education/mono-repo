"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

type Props = {
  label: string;
  onExport: () => void | Promise<void>;
  onImport?: (file: File) => void | Promise<void>;
  importAccept?: string;
  extra?: React.ReactNode;
  busy?: boolean;
  note?: string;
};

export function DataListToolbar({ label, onExport, onImport, importAccept = "application/json", extra, busy, note }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const working = busy || localBusy;

  async function run(task: () => void | Promise<void>) {
    setLocalBusy(true);
    try {
      await task();
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <div className="data-list-toolbar">
      <span className="data-list-toolbar-label">{label}</span>
      <div className="data-list-toolbar-actions">
        {extra}
        <button
          type="button"
          className={`btn btn-outline data-list-btn${working ? " is-busy" : ""}`}
          disabled={working}
          onClick={() => void run(onExport)}
        >
          <Download size={14} /> Export
        </button>
        {onImport ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={importAccept}
              className="data-list-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void run(() => onImport(file));
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              className={`btn btn-outline data-list-btn${working ? " is-busy" : ""}`}
              disabled={working}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} /> Import
            </button>
          </>
        ) : null}
      </div>
      {note ? <p className="hint data-list-note">{note}</p> : null}
    </div>
  );
}
