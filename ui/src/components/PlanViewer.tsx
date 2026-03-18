import ReactMarkdown from "react-markdown";

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
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
