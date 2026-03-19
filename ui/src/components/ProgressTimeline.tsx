import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProgressTimelineProps {
  content: string;
}

export default function ProgressTimeline({ content }: ProgressTimelineProps) {
  return (
    <div
      className="rounded-lg border p-6 prose prose-invert max-w-none"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      {content.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>No progress logged yet.</p>
      )}
    </div>
  );
}
