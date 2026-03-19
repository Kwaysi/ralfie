import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ralfMdPath } from './paths.js';
import { listBoards } from './board.js';

const HEADER = `# RALF.md

## How Ralfie Works

Ralfie is an orchestration system for agentic coding loops. It manages planning, execution, tracking, and progress visualization across boards.

### Board Structure

Each board lives in \`.ralfie/boards/<board-name>/\` and contains:

- **plan.md** — The implementation plan with milestones and architecture decisions
- **prd.json** — Product requirements document with trackable items. Each item has a status: \`pending\`, \`in_progress\`, \`done\`, \`failed\`, or \`verified\`
- **progress.md** — Append-only log of completed work, decisions, and notes

### Workflow

1. \`ralf plan\` — Create a new board with a plan and PRD via interactive agent session
2. \`ralf run <board>\` — Execute iterations: pick a PRD item, implement it, run feedback loops, update progress
3. \`ralf edit <board>\` — Modify an existing board's plan or PRD
4. \`ralf serve\` — Launch the real-time dashboard to monitor all boards

## Active Boards
`;

function boardEntry(name: string, description: string): string {
  return `- **${name}**${description ? ` — ${description}` : ''} → [progress](.ralfie/boards/${name}/progress.md)`;
}

export async function ensureRalfMd(cwd?: string): Promise<void> {
  const path = ralfMdPath(cwd);
  await mkdir(dirname(path), { recursive: true });

  const boards = await listBoards(cwd);
  const entries = boards.map((b) => boardEntry(b.name, b.description)).join('\n');
  const content = HEADER + (entries ? entries + '\n' : '');

  // If file already exists, don't overwrite
  try {
    await readFile(path, 'utf-8');
    return;
  } catch {
    // File doesn't exist, create it
  }

  await writeFile(path, content);
}

export async function appendBoardToRalfMd(
  name: string,
  description: string,
  cwd?: string,
): Promise<void> {
  const path = ralfMdPath(cwd);

  let existing: string;
  try {
    existing = await readFile(path, 'utf-8');
  } catch {
    // RALF.md doesn't exist yet — create it with this board
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, HEADER + boardEntry(name, description) + '\n');
    return;
  }

  // Check if board already listed
  if (existing.includes(`**${name}**`)) {
    return;
  }

  // Append the entry
  const entry = boardEntry(name, description) + '\n';
  await writeFile(path, existing.trimEnd() + '\n' + entry);
}
