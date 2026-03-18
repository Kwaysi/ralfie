import { useState } from "react";
import { triggerRun } from "../lib/api";

interface RunDialogProps {
  open: boolean;
  board: string;
  onClose: () => void;
}

export default function RunDialog({ open, board, onClose }: RunDialogProps) {
  const [iterations, setIterations] = useState(10);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleStart() {
    setLoading(true);
    try {
      await triggerRun(board, iterations);
      setStarted(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStarted(false);
    setIterations(10);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-80">
        {started ? (
          <>
            <div className="text-[var(--success)] font-bold mb-3">
              Run started
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Agent loop is running in the background for board{" "}
              <span className="text-[var(--text)] font-mono">{board}</span>.
            </p>
            <button
              onClick={handleClose}
              className="w-full px-3 py-2 rounded text-sm bg-[var(--border)] hover:opacity-80 cursor-pointer"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <div className="font-bold mb-4">Start Run</div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Max iterations
            </label>
            <input
              type="number"
              min={1}
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm mb-4 outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 px-3 py-2 rounded text-sm bg-[var(--border)] hover:opacity-80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded text-sm bg-[var(--accent)] text-white font-bold hover:opacity-80 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Starting..." : "Start Run"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
