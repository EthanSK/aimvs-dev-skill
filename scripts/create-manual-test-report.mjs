#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  assertSafeRelativeFilename,
  assertValidSlug,
  fail,
  formatDate,
  getRepoRoot,
  git,
  insertionMarker,
  pad,
  readReportSource,
  resolveReportWorkspace,
  titleFromSlug,
  writeFileAtomically,
} from './manual-test-report-common.mjs';
import { renderManualTestReport } from './render-manual-test-report.mjs';

const options = parseOptions(process.argv.slice(2));
const repoRoot = getRepoRoot();
const now = new Date();
const timestamp = formatLocalIsoTimestamp(now);
const branch = git(['branch', '--show-current']) || '(detached)';
const baseCommit = git(['rev-parse', 'HEAD']);
const status = git(['status', '--short']);
const workingTree = status ? 'dirty' : 'clean';
const fingerprint = createWorkingTreeFingerprint(repoRoot, status, baseCommit);
const workspace = resolveReportWorkspace({
  create: true,
  repoRoot,
  slug: options.slug,
});
const existingReport = readReportSource(workspace.sourcePath);
const markerIndex = existingReport.indexOf(insertionMarker);
if (markerIndex === -1) {
  fail(`${workspace.directoryName} is missing its insertion marker`);
}
if (
  existingReport.indexOf(
    insertionMarker,
    markerIndex + insertionMarker.length,
  ) !== -1
) {
  fail(`${workspace.directoryName} contains more than one insertion marker`);
}

validateScreenshotFiles(options.screenshots, workspace.reportDirectory, repoRoot);
const entry = `<!-- aimvs-manual-test-entry -->

\`\`\`yaml
date: ${yamlString(timestamp)}
result: ${options.result}
confidence: ${yamlString(options.confidence)}
branch: ${yamlString(branch)}
base_commit: ${baseCommit}
working_tree: ${workingTree}
diff_fingerprint: sha256:${fingerprint}
browser: ${yamlString(options.browser)}
stack: ${options.stack}
url: ${yamlString(options.url)}
screenshots:
${options.screenshots.map((screenshot) => `  - ${JSON.stringify(screenshot)}`).join('\n')}
areas:
${options.areas.map((area) => `  - ${yamlString(area)}`).join('\n')}
\`\`\`

## ${titleFromSlug(options.slug)}

### Purpose

<!-- State what this session tested and why. -->

### Git state

Changed paths at test time:

\`\`\`text
${status || '(clean working tree)'}
\`\`\`

### Scenarios

#### <!-- Scenario name --> — ${options.result}

1. <!-- Exact user-visible steps. -->

Expected: <!-- Expected behavior. -->

Actual: <!-- Observed behavior and evidence. -->

### Supporting checks

- Emulator state: <!-- Relevant Firestore/Storage documents and side effects. -->
- Frontend log: <!-- Relevant new errors/warnings, or explicitly none. -->
- API/emulator logs: <!-- Relevant new errors/warnings, or explicitly none. -->

### Issues and retests

<!-- Issues found, fixes made, and the exact retest result. Use "None" when appropriate. -->

### Points of weirdness

<!-- Evidence-backed surprising code or behavior the user should see. Label each item as a confirmed bug,
intentional-but-non-obvious behavior, or open question. Use "None" when appropriate. -->

### Not verified

<!-- Meaningful gaps. Use "None" only when the intended scope was fully covered. -->`;
const insertionIndex = markerIndex + insertionMarker.length;
const updatedReport = `${existingReport.slice(0, insertionIndex)}\n\n${entry}${existingReport.slice(insertionIndex)}`; // Insert above the untouched prior entries so the history stays newest-first without rewriting old evidence.
writeFileAtomically(workspace.sourcePath, updatedReport);
await renderManualTestReport(workspace);

console.log(`source=${workspace.sourcePath}`);
console.log(`html=${workspace.htmlPath}`);

function parseOptions(args) {
  const parsed = {
    areas: [],
    browser: undefined,
    confidence: undefined,
    currentScreenshot: undefined,
    result: undefined,
    screenshots: [],
    slug: undefined,
    stack: undefined,
    url: undefined,
  };
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!value) fail(`Missing value for ${name ?? 'argument'}`);
    switch (name) {
      case '--area':
        parsed.areas.push(value);
        break;
      case '--browser':
        parsed.browser = value;
        break;
      case '--confidence':
        parsed.confidence = value;
        break;
      case '--caption':
        requireCurrentScreenshot(parsed, name).caption = value;
        break;
      case '--result':
        parsed.result = value;
        break;
      case '--evidence-title':
        finishCurrentScreenshot(parsed);
        parsed.currentScreenshot = { title: value };
        break;
      case '--proves':
        requireCurrentScreenshot(parsed, name).proves = value;
        break;
      case '--screenshot':
        requireCurrentScreenshot(parsed, name).filename = value;
        break;
      case '--slug':
        parsed.slug = value;
        break;
      case '--stack':
        parsed.stack = value;
        break;
      case '--url':
        parsed.url = value;
        break;
      default:
        fail(`Unknown argument: ${name}`);
    }
  }
  finishCurrentScreenshot(parsed);
  assertValidSlug(parsed.slug);
  if (!['passed', 'failed', 'partial', 'blocked'].includes(parsed.result)) {
    fail('--result must be passed, failed, partial, or blocked');
  }
  if (!parsed.confidence?.trim()) fail('--confidence is required');
  if (/\r|\n/.test(parsed.confidence) || parsed.confidence.length > 200) {
    fail('--confidence must be one line and no more than 200 characters');
  }
  if (!parsed.browser) fail('--browser is required');
  if (!parsed.stack?.match(/^\d+$/)) {
    fail('--stack must be a non-negative integer');
  }
  if (!parsed.url) fail('--url is required');
  if (parsed.areas.length === 0) fail('At least one --area is required');
  delete parsed.currentScreenshot;
  return parsed;
}

function requireCurrentScreenshot(parsed, optionName) {
  if (!parsed.currentScreenshot) {
    fail(`${optionName} must follow --evidence-title`);
  }
  return parsed.currentScreenshot;
}

function finishCurrentScreenshot(parsed) {
  const screenshot = parsed.currentScreenshot;
  if (!screenshot) return;
  for (const field of ['title', 'filename', 'caption', 'proves']) {
    if (!screenshot[field]?.trim()) {
      fail(`Each evidence screenshot requires ${field}`);
    }
  }
  assertSafeRelativeFilename(screenshot.filename, '--screenshot');
  parsed.screenshots.push(screenshot);
  parsed.currentScreenshot = undefined;
}

function validateScreenshotFiles(screenshots, reportDirectory, repoRoot) {
  for (const screenshot of screenshots) {
    if (!screenshot.filename.toLowerCase().endsWith('.png')) {
      fail(`Evidence screenshots must be PNG files: ${screenshot.filename}`);
    }
    const screenshotPath = join(reportDirectory, screenshot.filename);
    if (!existsSync(screenshotPath)) {
      fail(
        `Evidence screenshot does not exist in the report folder: ${screenshot.filename}`,
      );
    }
    const repoRelativePath = relative(repoRoot, screenshotPath);
    const lfsAttribute = git(['check-attr', 'filter', '--', repoRelativePath], {
      cwd: repoRoot,
    });
    if (!lfsAttribute.endsWith(': filter: lfs')) {
      fail(
        `Evidence screenshot must use Git LFS. Add "manual-test-results/**/*.png filter=lfs diff=lfs merge=lfs -text" to .gitattributes: ${repoRelativePath}`,
      );
    }
  }
}

function createWorkingTreeFingerprint(repoRoot, status, baseCommit) {
  const hash = createHash('sha256');
  hash.update(baseCommit);
  hash.update('\0');
  hash.update(status);
  hash.update('\0');
  hash.update(
    execFileSync('git', ['diff', 'HEAD', '--binary'], {
      cwd: repoRoot,
      maxBuffer: 100 * 1024 * 1024,
    }),
  );
  const untrackedPaths = git(
    ['ls-files', '--others', '--exclude-standard', '-z'],
    { cwd: repoRoot },
  )
    .split('\0')
    .filter(Boolean);
  for (const untrackedPath of untrackedPaths) {
    hash.update('\0');
    hash.update(untrackedPath);
    hash.update('\0');
    hash.update(readFileSync(join(repoRoot, untrackedPath)));
  }
  return hash.digest('hex');
}

function formatLocalIsoTimestamp(date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offset);
  return `${formatDate(date)}T${formatTime(date)}${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function yamlString(value) {
  return JSON.stringify(value);
}
