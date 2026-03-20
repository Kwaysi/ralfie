import { jsx as _jsx } from "react/jsx-runtime";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function PlanViewer({ content }) {
    return (_jsx("div", { className: "rounded-lg border p-6 prose prose-invert max-w-none", style: {
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
        }, children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: content }) }));
}
//# sourceMappingURL=PlanViewer.js.map