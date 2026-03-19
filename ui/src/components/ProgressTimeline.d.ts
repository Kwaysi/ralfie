interface ProgressTimelineProps {
    content: string;
}
interface ProgressEntry {
    heading: string;
    body: string;
}
export declare function parseEntries(content: string): ProgressEntry[] | null;
export default function ProgressTimeline({ content }: ProgressTimelineProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ProgressTimeline.d.ts.map