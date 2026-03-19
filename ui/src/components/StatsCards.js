import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const cards = [
    { label: "Total Items", key: "total", color: "var(--text)" },
    { label: "Completed", key: "done", color: "var(--success)" },
    { label: "In Progress", key: "in_progress", color: "var(--accent)" },
    { label: "Failed", key: "failed", color: "var(--danger)" },
    { label: "Verified", key: "verified", color: "var(--success)" },
];
export default function StatsCards({ items }) {
    const counts = {
        total: items.length,
        done: items.filter((i) => i.status === "done").length,
        in_progress: items.filter((i) => i.status === "in_progress").length,
        failed: items.filter((i) => i.status === "failed").length,
        verified: items.filter((i) => i.status === "verified").length,
    };
    return (_jsx("div", { className: "grid grid-cols-5 gap-4", children: cards.map((card) => (_jsxs("div", { className: "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4", children: [_jsx("div", { className: "text-xs text-[var(--text-muted)] mb-1", children: card.label }), _jsx("div", { className: "text-2xl font-bold", style: { color: card.color }, children: counts[card.key] })] }, card.key))) }));
}
//# sourceMappingURL=StatsCards.js.map