import type { PrdItem } from "@ralfie/shared";
interface ItemDrawerProps {
    item: PrdItem | null;
    onClose: () => void;
    onNavigate?: (id: string) => void;
    siblingIds?: string[];
    boardName?: string;
    activeRuns?: number;
    onRefresh?: () => void;
    progressContent?: string;
}
export default function ItemDrawer({ item, onClose, onNavigate, siblingIds, boardName, activeRuns, onRefresh, progressContent }: ItemDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ItemDrawer.d.ts.map