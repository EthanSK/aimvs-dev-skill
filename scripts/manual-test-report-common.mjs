import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

export const insertionMarker = '<!-- aimvs-manual-test-results:insert-here -->';
export const reportSourceFilename = 'manual-test-results.md';
export const reportHtmlFilename = 'index.html';
export const reportGuardrail =
  'Newest entries for this checkout/worktree appear first. Never copy entries between worktrees; older entries are immutable and remain below newer entries.';

export function getRepoRoot() {
  return git(['rev-parse', '--show-toplevel']);
}

export function resolveReportWorkspace({ repoRoot, slug, create }) {
  const reportRoot = join(repoRoot, 'manual-test-results');
  if (create) mkdirSync(reportRoot, { recursive: true });
  if (!existsSync(reportRoot)) {
    fail('This checkout/worktree has no manual-test-results directory');
  }

  const entries = readdirSync(reportRoot, { withFileTypes: true });
  const reportDirectories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
  const legacyReports = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);
  if (legacyReports.length > 0) {
    fail(
      `Legacy top-level manual-test report found; move it into a same-named folder as ${reportSourceFilename} before continuing: ${legacyReports.join(', ')}`,
    );
  }
  if (reportDirectories.length > 1) {
    fail(
      `This checkout/worktree has multiple manual-test report folders: ${reportDirectories.join(', ')}`,
    );
  }

  const directoryName =
    reportDirectories[0] ??
    (create ? `${formatDate(new Date())}-${slug}` : undefined);
  if (!directoryName) {
    fail('This checkout/worktree has no manual-test report folder');
  }
  if (!directoryName.match(/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/)) {
    fail(
      `Manual-test report folder must have a date-prefixed kebab-case name: ${directoryName}`,
    );
  }

  const reportDirectory = join(reportRoot, directoryName);
  const sourcePath = join(reportDirectory, reportSourceFilename);
  const htmlPath = join(reportDirectory, reportHtmlFilename);
  if (create) {
    mkdirSync(reportDirectory, { recursive: true });
    if (!existsSync(sourcePath)) {
      writeFileAtomically(
        sourcePath,
        `# ${titleFromSlug(directoryName.replace(/^\d{4}-\d{2}-\d{2}-/, ''))} Manual Test Results\n\n${reportGuardrail}\n\n${insertionMarker}\n`,
      );
    }
  }
  if (!existsSync(sourcePath)) {
    fail(`${directoryName} is missing ${reportSourceFilename}`);
  }

  return { directoryName, htmlPath, reportDirectory, sourcePath };
}

export function assertValidSlug(slug) {
  if (!slug?.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) {
    fail('--slug must be lowercase kebab-case');
  }
}

export function assertSafeRelativeFilename(filename, optionName) {
  if (
    !filename ||
    basename(filename) !== filename ||
    filename === '.' ||
    filename === '..'
  ) {
    fail(`${optionName} must be a filename in the report folder`);
  }
}

export function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: opts.cwd,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  }).trimEnd();
}

export function writeFileAtomically(path, contents) {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

export function readReportSource(path) {
  return readFileSync(path, 'utf8');
}

export function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function pad(value) {
  return String(value).padStart(2, '0');
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}
