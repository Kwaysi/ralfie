import { readFile, writeFile } from 'node:fs/promises';
import { claudeMdPath } from './paths.js';

const RALFIE_SECTION = `## Ralfie

This project uses [Ralfie](https://github.com/anthropics/ralfie) for agentic task orchestration. See the file below for board status and how ralfie works.

@.ralfie/RALF.md
`;

export async function ensureClaudeMd(cwd?: string): Promise<void> {
  const path = claudeMdPath(cwd);

  let existing: string;
  try {
    existing = await readFile(path, 'utf-8');
  } catch {
    // CLAUDE.md doesn't exist — create it with the Ralfie section
    await writeFile(path, `# CLAUDE.md\n\n${RALFIE_SECTION}`);
    return;
  }

  // Already has a Ralfie section — nothing to do
  if (existing.includes('## Ralfie')) {
    return;
  }

  // Append the Ralfie section
  await writeFile(path, existing.trimEnd() + '\n\n' + RALFIE_SECTION);
}
