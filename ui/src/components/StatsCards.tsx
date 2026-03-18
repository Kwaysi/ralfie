import type { PrdItem } from "@ralfie/shared";

interface StatsCardsProps {
  items: PrdItem[];
}

const cards = [
  { label: "Total Items", key: "total", color: "var(--text)" },
  { label: "Completed", key: "done", color: "var(--success)" },
  { label: "In Progress", key: "in_progress", color: "var(--accent)" },
  { label: "Failed", key: "failed", color: "var(--danger)" },
  { label: "Verified", key: "verified", color: "var(--success)" },
] as const;

export default function StatsCards({ items }: StatsCardsProps) {
  const counts: Record<string, number> = {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    failed: items.filter((i) => i.status === "failed").length,
    verified: items.filter((i) => i.status === "verified").length,
  };

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4"
        >
          <div className="text-xs text-[var(--text-muted)] mb-1">
            {card.label}
          </div>
          <div className="text-2xl font-bold" style={{ color: card.color }}>
            {counts[card.key]}
          </div>
        </div>
      ))}
    </div>
  );
}
