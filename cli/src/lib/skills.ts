import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_NAMES = ['ralf-plan', 'ralf-edit', 'ralf-run', 'ralf-finalize', 'ralf-review'] as const;

const __dirname = dirname(fileURLToPath(import.meta.url));

function skillsSourceDir(): string {
  return join(__dirname, '..', 'skills');
}

function skillsTargetDir(cwd = process.cwd()): string {
  return join(cwd, '.claude', 'skills');
}

export async function installSkills(cwd?: string): Promise<void> {
  const srcDir = skillsSourceDir();
  const destDir = skillsTargetDir(cwd);

  await Promise.all(
    SKILL_NAMES.map(async (name) => {
      const skillDir = join(destDir, name);
      await mkdir(skillDir, { recursive: true });
      const content = await readFile(join(srcDir, name, 'SKILL.md'), 'utf-8');
      await writeFile(join(skillDir, 'SKILL.md'), content);
    }),
  );
}

export async function skillsInstalled(cwd?: string): Promise<boolean> {
  const destDir = skillsTargetDir(cwd);
  try {
    await Promise.all(
      SKILL_NAMES.map((name) => readFile(join(destDir, name, 'SKILL.md'), 'utf-8')),
    );
    return true;
  } catch {
    return false;
  }
}

export { SKILL_NAMES };
