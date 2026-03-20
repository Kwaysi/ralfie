import type { BoardWithStatus, RalfieConfig } from '@ralfie/shared';
export declare function fetchBoards(): Promise<BoardWithStatus[]>;
export declare function fetchBoard(name: string): Promise<BoardWithStatus>;
export declare function verifyItem(board: string, itemId: string): Promise<{
    ok: boolean;
}>;
export declare function triggerRun(board: string, iterations: number): Promise<{
    ok: boolean;
    sessionId: string;
    iterations: number;
}>;
export declare function stopBoard(board: string): Promise<{
    ok: boolean;
    stopped: number;
}>;
export declare function resetItemApi(board: string, itemId: string): Promise<{
    ok: boolean;
}>;
export declare function addCommentApi(board: string, itemId: string, message: string): Promise<{
    ok: boolean;
}>;
export declare function stopServer(): Promise<{
    ok: boolean;
}>;
export declare function fetchConfig(): Promise<RalfieConfig>;
export declare function updateConfig(config: RalfieConfig): Promise<{
    ok: boolean;
}>;
//# sourceMappingURL=api.d.ts.map