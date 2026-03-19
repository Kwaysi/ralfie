import type { PrdItem } from "@ralfie/shared";
interface PrdKanbanProps {
    items: PrdItem[];
    onVerify: (itemId: string) => void;
    onRefresh: () => void;
    boardName: string;
    activeRuns: number;
    progressContent?: string;
}
export default function PrdKanban({ items, onVerify, onRefresh, boardName, activeRuns, progressContent }: PrdKanbanProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=PrdKanban.d.ts.map