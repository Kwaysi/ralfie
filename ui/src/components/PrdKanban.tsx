import { useMemo, useState } from "react";
import type { ItemStatus, PrdItem } from "@ralfie/shared";
import ItemDrawer from "./ItemDrawer";

interface PrdKanbanProps {
  items: PrdItem[];
  onVerify: (itemId: string) => void;
  onRefresh: () => void;
  boardName: string;
  activeRuns: number;
  progressContent?: string;
}

const columns: { status: ItemStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pending", color: "var(--text-muted)" },
  { status: "in_progress", label: "In Progress", color: "var(--accent)" },
  { status: "done", label: "Done", color: "var(--success)" },
  { status: "failed", label: "Failed", color: "var(--danger)" },
  { status: "verified", label: "Verified", color: "var(--success)" },
];

function sortColumnItems(items: PrdItem[], status: ItemStatus): void {
  const key: "started_at" | "completed_at" | null =
    status === "in_progress" ? "started_at" :
    status === "done" || status === "verified" ? "completed_at" :
    null;
  if (!key) return; // pending and failed keep array order
  items.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;
    return (bVal as string).localeCompare(aVal as string);
  });
}

export default function PrdKanban({ items, onVerify, onRefresh, boardName, activeRuns, progressContent }: PrdKanbanProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;

  // Build sorted column maps so ItemDrawer can cycle within the same status
  const columnItemIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of columns) {
      const colItems = items.filter((i) => i.status === col.status);
      sortColumnItems(colItems, col.status);
      map[col.status] = colItems.map((i) => i.id);
    }
    return map;
  }, [items]);

  const siblingIds = selectedItem ? columnItemIds[selectedItem.status] ?? [] : [];

  return (
    <>
      <div className="grid grid-cols-5 gap-3 h-full">
        {columns.map((col) => {
          const colItems = items.filter((i) => i.status === col.status);
          sortColumnItems(colItems, col.status);
          return (
            <div key={col.status} className="min-w-0 flex flex-col min-h-0">
              <div
                className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center justify-between shrink-0"
                style={{ color: col.color }}
              >
                <span>{col.label}</span>
                <span className="text-[var(--text-muted)] font-normal">
                  {colItems.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto min-h-0 flex-1">
                {colItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedId(item.id)}
                    onVerify={
                      item.status === "done" && activeRuns === 0 ? () => onVerify(item.id) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ItemDrawer
        item={selectedItem}
        onClose={() => setSelectedId(null)}
        onNavigate={setSelectedId}
        siblingIds={siblingIds}
        boardName={boardName}
        activeRuns={activeRuns}
        onRefresh={onRefresh}
        progressContent={progressContent}
      />
    </>
  );
}

function ItemCard({
  item,
  onClick,
  onVerify,
}: {
  item: PrdItem;
  onClick: () => void;
  onVerify?: () => void;
}) {
  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-xs cursor-pointer hover:border-[var(--accent)] transition-colors"
      onClick={onClick}
    >
      <div className="font-bold font-mono mb-1">{item.id}</div>
      <div className="text-[var(--text-muted)] mb-1">{item.category}</div>
      <div className="mb-2 leading-relaxed line-clamp-3">{item.description}</div>
      {item.assigned_to && (
        <div className="text-[var(--accent)] mb-1 truncate">
          ⚡ {item.assigned_to}
        </div>
      )}
      <div className="flex items-center justify-between">
        {item.comments.length > 0 && (
          <span className="text-[var(--text-muted)]">
            💬 {item.comments.length}
          </span>
        )}
        {onVerify && (
          <button
            onClick={(e) => { e.stopPropagation(); onVerify(); }}
            className="ml-auto px-2 py-1 rounded text-xs bg-[var(--success)] text-black font-bold hover:opacity-80 cursor-pointer"
          >
            Verify
          </button>
        )}
      </div>
    </div>
  );
}
