import type { PrdItem } from "@ralfie/shared";
interface ItemDrawerProps {
    item: PrdItem | null;
    onClose: () => void;
    boardName?: string;
    activeRuns?: number;
    onRefresh?: () => void;
}
export default function ItemDrawer({ item, onClose, boardName, activeRuns, onRefresh }: ItemDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ItemDrawer.d.ts.map