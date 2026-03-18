import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Board } from "@ralfie/shared";
import { fetchBoards } from "../lib/api";
import { useWs } from "../lib/ws";
import StatsCards from "../components/StatsCards";
import ItemsPerDayChart from "../components/ItemsPerDayChart";

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchBoards().then(setBoards).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  useWs(useCallback(() => load(), [load]));

  if (error) return <div className="text-[var(--danger)]">{error}</div>;

  const allItems = boards.flatMap((b) => b.prd.items);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>

      <StatsCards items={allItems} />

      <div className="mt-6">
        <ItemsPerDayChart items={allItems} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm text-[var(--text-muted)] mb-3">Boards</h2>
        {boards.length === 0 ? (
          <div className="text-[var(--text-muted)] text-sm">
            No boards yet. Run <code className="text-[var(--accent)]">ralf plan</code> to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              const total = board.prd.items.length;
              const done = board.prd.items.filter(
                (i) => i.status === "done" || i.status === "verified",
              ).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Link
                  key={board.meta.name}
                  to={`/boards/${encodeURIComponent(board.meta.name)}`}
                  className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
                >
                  <div className="font-bold mb-1">{board.meta.name}</div>
                  {board.meta.description && (
                    <div className="text-xs text-[var(--text-muted)] mb-3">
                      {board.meta.description}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--success)] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {done}/{total} ({pct}%)
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
