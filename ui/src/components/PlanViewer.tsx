import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PlanViewerProps {
  content: string;
}

export default function PlanViewer({ content }: PlanViewerProps) {
  return (
    <div
      className="rounded-lg border p-6 prose prose-invert max-w-none"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
