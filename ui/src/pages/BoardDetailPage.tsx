import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { BoardWithStatus } from "@ralfie/shared";
import { fetchBoard, verifyItem, stopBoard } from "../lib/api";
import { useWs } from "../lib/ws";
import PrdKanban from "../components/PrdKanban";
import PlanViewer from "../components/PlanViewer";
import ProgressTimeline from "../components/ProgressTimeline";
import RunDialog from "../components/RunDialog";

type Tab = "prd" | "plan" | "progress";

export default function BoardDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [board, setBoard] = useState<BoardWithStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("prd");
  const [runOpen, setRunOpen] = useState(false);

  const load = useCallback(() => {
    if (!name) return;
    fetchBoard(name).then(setBoard).catch((e) => setError(e.message));
  }, [name]);

  useEffect(load, [load]);

  useWs(
    useCallback(
      (ev) => {
        if (ev.board === name) load();
      },
      [name, load],
    ),
  );

  async function handleVerify(itemId: string) {
    if (!name) return;
    await verifyItem(name, itemId);
    load();
  }

  if (error) return <div className="text-[var(--danger)]">{error}</div>;
  if (!board) return <div className="text-[var(--text-muted)]">Loading...</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "prd", label: "PRD Items" },
    { key: "plan", label: "Plan" },
    { key: "progress", label: "Progress" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold">{board.meta.name}</h1>
          {board.meta.description && (
            <p className="text-sm text-[var(--text-muted)]">
              {board.meta.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {board.activeRuns > 0 && (
            <button
              onClick={async () => {
                await stopBoard(board.meta.name);
                load();
              }}
              className="px-4 py-2 rounded text-sm bg-[var(--danger)] text-white font-bold hover:opacity-80 cursor-pointer"
            >
              Stop ({board.activeRuns})
            </button>
          )}
          {board.activeRuns === 0 && (
            <button
              onClick={() => setRunOpen(true)}
              className="px-4 py-2 rounded text-sm bg-[var(--accent)] text-white font-bold hover:opacity-80 cursor-pointer"
            >
              Run
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm cursor-pointer border-b-2 -mb-px ${
              tab === t.key
                ? "border-[var(--accent)] text-[var(--accent)] font-bold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {board.activeRuns > 0 && (
        <div className="mt-3 px-3 py-2 rounded text-sm bg-[var(--warning)]/15 border border-[var(--warning)]/30 text-[var(--warning)] shrink-0">
          Board is locked — agent run in progress
        </div>
      )}

      <div className="flex-1 min-h-0 pt-4">
        {tab === "prd" && (
          <PrdKanban items={board.prd.items} onVerify={handleVerify} onRefresh={load} boardName={board.meta.name} activeRuns={board.activeRuns} />
        )}
        {tab === "plan" && (
          <div className="h-full overflow-auto">
            <PlanViewer content={board.plan} />
          </div>
        )}
        {tab === "progress" && (
          <div className="h-full overflow-auto">
            <ProgressTimeline content={board.progress} />
          </div>
        )}
      </div>

      <RunDialog
        open={runOpen}
        board={board.meta.name}
        onClose={() => setRunOpen(false)}
      />
    </div>
  );
}
