import { boardExists } from '../lib/board.js';
import { stopBoard } from '../lib/stop-board.js';

export async function stopCommand(board: string, cwd?: string): Promise<void> {
  if (!(await boardExists(board, cwd))) {
    console.error(`Board not found: ${board}`);
    process.exitCode = 1;
    return;
  }

  const result = await stopBoard(board, cwd);

  if (result.stopped === 0) {
    console.log(`No active runs for board ${board}`);
    return;
  }

  console.log(
    `Stopped ${result.stopped} process${result.stopped === 1 ? '' : 'es'}, ` +
      `released ${result.locksReleased} lock${result.locksReleased === 1 ? '' : 's'}, ` +
      `reset ${result.itemsReset} item${result.itemsReset === 1 ? '' : 's'}`,
  );
}
