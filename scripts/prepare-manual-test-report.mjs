#!/usr/bin/env node
// Note: Creates or resolves the report folder for a manual-test slug. Run before capturing evidence so screenshots and Markdown entries share the same destination.

import {
  assertValidSlug,
  fail,
  getRepoRoot,
  resolveReportWorkspace,
} from './manual-test-report-common.mjs';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--slug') {
  fail('Usage: prepare-manual-test-report.mjs --slug <lowercase-kebab-case>');
}
const slug = args[1];
assertValidSlug(slug);
const workspace = resolveReportWorkspace({
  create: true,
  repoRoot: getRepoRoot(),
  slug,
});
console.log(workspace.reportDirectory);
