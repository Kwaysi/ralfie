import type { ItemStatus, PrdItem } from "@ralfie/shared";

interface PrdKanbanProps {
  items: PrdItem[];
  onVerify: (itemId: string) => void;
}

const columns: { status: ItemStatus; label: string; color: string }[] = [
  { status: "pending", label: "Pending", color: "var(--text-muted)" },
  { status: "in_progress", label: "In Progress", color: "var(--accent)" },
  { status: "done", label: "Done", color: "var(--success)" },
  { status: "failed", label: "Failed", color: "var(--danger)" },
  { status: "verified", label: "Verified", color: "var(--success)" },
];

export default function PrdKanban({ items, onVerify }: PrdKanbanProps) {
  return (
    <div className="grid grid-cols-5 gap-3 items-start">
      {columns.map((col) => {
        const colItems = items.filter((i) => i.status === col.status);
        return (
          <div key={col.status} className="min-w-0">
            <div
              className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center justify-between"
              style={{ color: col.color }}
            >
              <span>{col.label}</span>
              <span className="text-[var(--text-muted)] font-normal">
                {colItems.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {colItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onVerify={
                    item.status === "done" ? () => onVerify(item.id) : undefined
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({
  item,
  onVerify,
}: {
  item: PrdItem;
  onVerify?: () => void;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-xs">
      <div className="font-bold font-mono mb-1">{item.id}</div>
      <div className="text-[var(--text-muted)] mb-1">{item.category}</div>
      <div className="mb-2 leading-relaxed">{item.description}</div>
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
            onClick={onVerify}
            className="ml-auto px-2 py-1 rounded text-xs bg-[var(--success)] text-black font-bold hover:opacity-80 cursor-pointer"
          >
            Verify
          </button>
        )}
      </div>
    </div>
  );
}
