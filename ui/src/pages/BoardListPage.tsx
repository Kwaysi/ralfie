import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { BoardWithStatus, ItemStatus } from "@ralfie/shared";
import { fetchBoards } from "../lib/api";
import { useWs } from "../lib/ws";

const STATUS_COLORS: Record<ItemStatus, string> = {
  pending: "var(--text-muted)",
  in_progress: "var(--accent)",
  done: "var(--success)",
  failed: "var(--danger)",
  verified: "var(--success)",
};

function StatusCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className="text-xs" style={{ color }}>
      {count} {label}
    </span>
  );
}

export default function BoardListPage() {
  const [boards, setBoards] = useState<BoardWithStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchBoards()
      .then((b) => {
        b.sort((a, z) => (z.meta.created_at ?? '').localeCompare(a.meta.created_at ?? ''));
        return b;
      })
      .then(setBoards)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  useWs(useCallback(() => load(), [load]));

  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Boards</h1>

      {boards.length === 0 ? (
        <div className="text-[var(--text-muted)] text-sm">
          No boards found. Run <code className="text-[var(--accent)]">ralf plan</code> to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => {
            const items = board.prd.items;
            const total = items.length;
            const counts: Record<ItemStatus, number> = {
              pending: 0,
              in_progress: 0,
              done: 0,
              failed: 0,
              verified: 0,
            };
            for (const item of items) {
              counts[item.status]++;
            }

            return (
              <Link
                key={board.meta.name}
                to={`/boards/${encodeURIComponent(board.meta.name)}`}
                className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
              >
                <div className="font-bold mb-1">{board.meta.name}</div>
                {board.meta.description && (
                  <div className="text-xs text-[var(--text-muted)] mb-2">
                    {board.meta.description}
                  </div>
                )}
                <div className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <span>{total} items</span>
                  {board.activeRuns > 0 && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}
                    >
                      {board.activeRuns} agent{board.activeRuns > 1 ? 's' : ''} running
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <StatusCount label="pending" count={counts.pending} color={STATUS_COLORS.pending} />
                  <StatusCount label="active" count={counts.in_progress} color={STATUS_COLORS.in_progress} />
                  <StatusCount label="done" count={counts.done} color={STATUS_COLORS.done} />
                  <StatusCount label="failed" count={counts.failed} color={STATUS_COLORS.failed} />
                  <StatusCount label="verified" count={counts.verified} color={STATUS_COLORS.verified} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
