import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_FILES = ['ralfie-plan.md', 'ralfie-edit.md', 'ralfie-run.md'] as const;

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
  await mkdir(destDir, { recursive: true });

  await Promise.all(
    SKILL_FILES.map(async (file) => {
      const content = await readFile(join(srcDir, file), 'utf-8');
      await writeFile(join(destDir, file), content);
    }),
  );
}

export async function skillsInstalled(cwd?: string): Promise<boolean> {
  const destDir = skillsTargetDir(cwd);
  try {
    await Promise.all(
      SKILL_FILES.map((file) => readFile(join(destDir, file), 'utf-8')),
    );
    return true;
  } catch {
    return false;
  }
}

export { SKILL_FILES };
