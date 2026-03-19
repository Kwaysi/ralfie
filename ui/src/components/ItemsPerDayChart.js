import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, } from "recharts";
function getLast7Days() {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const label = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({ date: iso, label });
    }
    return days;
}
export default function ItemsPerDayChart({ items }) {
    const days = getLast7Days();
    const activityByDay = new Map();
    for (const day of days) {
        activityByDay.set(day.date, new Set());
    }
    for (const item of items) {
        for (const comment of item.comments) {
            const day = comment.timestamp.slice(0, 10);
            activityByDay.get(day)?.add(item.id);
        }
    }
    const data = days.map((day) => ({
        name: day.label,
        items: activityByDay.get(day.date)?.size ?? 0,
    }));
    return (_jsxs("div", { className: "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4", children: [_jsx("div", { className: "text-sm text-[var(--text-muted)] mb-3", children: "Items with activity (last 7 days)" }), _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(BarChart, { data: data, children: [_jsx(XAxis, { dataKey: "name", tick: { fill: "var(--text-muted)", fontSize: 12 }, axisLine: { stroke: "var(--border)" }, tickLine: false }), _jsx(YAxis, { allowDecimals: false, tick: { fill: "var(--text-muted)", fontSize: 12 }, axisLine: { stroke: "var(--border)" }, tickLine: false, width: 30 }), _jsx(Tooltip, { contentStyle: {
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                                borderRadius: "6px",
                                fontSize: 12,
                            } }), _jsx(Bar, { dataKey: "items", fill: "#6366f1", radius: [4, 4, 0, 0] })] }) })] }));
}
//# sourceMappingURL=ItemsPerDayChart.js.map