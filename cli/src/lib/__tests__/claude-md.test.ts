import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureClaudeMd } from '../claude-md.js';
import { claudeMdPath } from '../paths.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-claude-md-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('ensureClaudeMd', () => {
  it('creates CLAUDE.md with Ralfie section when file does not exist', async () => {
    await ensureClaudeMd(tmp);

    const content = await readFile(claudeMdPath(tmp), 'utf-8');
    expect(content).toContain('# CLAUDE.md');
    expect(content).toContain('## Ralfie');
    expect(content).toContain('@.ralfie/RALF.md');
  });

  it('appends Ralfie section to existing CLAUDE.md without one', async () => {
    const existing = '# CLAUDE.md\n\n## Build\n\nnpm run build\n';
    await writeFile(claudeMdPath(tmp), existing);

    await ensureClaudeMd(tmp);

    const content = await readFile(claudeMdPath(tmp), 'utf-8');
    expect(content).toContain('## Build');
    expect(content).toContain('npm run build');
    expect(content).toContain('## Ralfie');
    expect(content).toContain('@.ralfie/RALF.md');
  });

  it('is a no-op when Ralfie section already exists', async () => {
    await ensureClaudeMd(tmp);
    const first = await readFile(claudeMdPath(tmp), 'utf-8');

    await ensureClaudeMd(tmp);
    const second = await readFile(claudeMdPath(tmp), 'utf-8');

    expect(second).toBe(first);
  });

  it('preserves existing CLAUDE.md content', async () => {
    const existing = '# My Project\n\nCustom instructions here.\n\n## Testing\n\nRun tests with npm test.\n';
    await writeFile(claudeMdPath(tmp), existing);

    await ensureClaudeMd(tmp);

    const content = await readFile(claudeMdPath(tmp), 'utf-8');
    expect(content).toContain('# My Project');
    expect(content).toContain('Custom instructions here.');
    expect(content).toContain('## Testing');
    expect(content).toContain('Run tests with npm test.');
    expect(content).toContain('## Ralfie');
  });
});
