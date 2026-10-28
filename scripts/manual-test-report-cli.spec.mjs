import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as common from './manual-test-report-common.mjs';

/** Executes the actual CLI orchestration with in-memory reports and no Git, files or screenshots. */
function runReport(fileName, args, options = {}) {
  const writes = [];
  const calls = [];
  const output = [];
  const workspace = {
    reportDirectory: '/fixture/report',
    sourcePath: '/fixture/report/manual-test-results.md',
    directoryName: 'fixture',
  };
  const source = readFileSync(
    new URL(fileName, import.meta.url),
    'utf8',
  ).replace(/^import[\s\S]*?from ['"][^'"]+['"];$/gm, ''); // Note: inject the CLI imports while retaining its complete parsing, fingerprint and insertion code.
  const context = {
    ...common,
    createHash,
    join,
    relative,
    process: { argv: ['node', fileName, ...args] },
    console: { log: (value) => output.push(value) },
    fail: (message) => {
      throw new Error(message);
    },
    getRepoRoot: () => '/fixture',
    resolveReportWorkspace: (value) => {
      calls.push(JSON.parse(JSON.stringify(value)));
      return workspace;
    },
    readReportSource: () =>
      options.report ??
      `# Results\n${common.insertionMarker}\n\nOlder record stays byte-for-byte.\n`,
    writeFileAtomically: (path, contents) => writes.push({ path, contents }),
    existsSync: () => options.screenshotExists !== false,
    execFileSync: (command, argv) => {
      assert.equal(command, 'git');
      assert.deepEqual(Array.from(argv), ['diff', 'HEAD', '--binary']);
      return Buffer.from(options.diff ?? 'diff fixture');
    },
    readUntrackedFingerprintContents: () => Buffer.from('new fixture contents'),
    git: (argv) => {
      switch (argv[0]) {
        case 'branch':
          return 'feature/fixture';
        case 'rev-parse':
          return 'base-sha';
        case 'status':
          return ' M fixture.ts';
        case 'ls-files':
          return 'new-fixture.ts\0';
        case 'check-attr':
          return `fixture: filter: ${options.lfs === false ? 'unspecified' : 'lfs'}`;
      }
      throw new Error('Unexpected fake Git command: ' + argv.join(' '));
    },
  };
  runInNewContext(source, context);
  return { writes, calls, output };
}

const required = [
  '--slug',
  'fixture-run',
  '--result',
  'blocked',
  '--confidence',
  'Only automated checks ran.',
  '--browser',
  'none',
  '--stack',
  '24',
  '--url',
  'http://fixture.test',
  '--area',
  'unit boundary',
];
const evidence = [
  '--evidence-title',
  'Fixture evidence',
  '--screenshot',
  'fixture.png',
  '--caption',
  'Synthetic image',
  '--proves',
  'Only the fixture boundary.',
];

test('prepare delegates a valid slug to the existing owned-workspace resolver', () => {
  const result = runReport('prepare-manual-test-report.mjs', [
    '--slug',
    'fixture-run',
  ]);
  assert.deepEqual(result.calls, [
    { create: true, repoRoot: '/fixture', slug: 'fixture-run' },
  ]);
  assert.deepEqual(result.output, ['/fixture/report']);
  assert.deepEqual(result.writes, []);
  assert.throws(
    () => runReport('prepare-manual-test-report.mjs', []),
    /Usage:/,
  );
});

test('create inserts one newest Markdown record and preserves all earlier bytes without rendering HTML', () => {
  const result = runReport('create-manual-test-report.mjs', required);
  assert.equal(result.writes.length, 1);
  assert.equal(result.writes[0].path, '/fixture/report/manual-test-results.md');
  const report = result.writes[0].contents;
  assert.match(report, /result: blocked/);
  assert.match(report, /branch: "feature\/fixture"/);
  assert.match(report, /working_tree: dirty/);
  assert.match(report, /diff_fingerprint: sha256:[a-f0-9]{64}/);
  assert.ok(report.endsWith('\n\nOlder record stays byte-for-byte.\n'));
  assert.equal(report.split('<!-- aimvs-manual-test-entry -->').length, 2);
  assert.deepEqual(result.output, [
    'source=/fixture/report/manual-test-results.md',
  ]);
  const different = runReport('create-manual-test-report.mjs', required, {
    diff: 'different real change',
  });
  assert.notEqual(
    report.match(/diff_fingerprint:.*/)[0],
    different.writes[0].contents.match(/diff_fingerprint:.*/)[0],
  );
});

test('create records complete standalone screenshot evidence only after existence and LFS checks', () => {
  const result = runReport('create-manual-test-report.mjs', [
    ...required,
    ...evidence,
  ]);
  assert.match(
    result.writes[0].contents,
    /"title":"Fixture evidence","filename":"fixture.png","caption":"Synthetic image","proves":"Only the fixture boundary\."/,
  );
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', [...required, ...evidence], {
        screenshotExists: false,
      }),
    /does not exist/,
  );
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', [...required, ...evidence], {
        lfs: false,
      }),
    /must use Git LFS/,
  );
});

test('create refuses malformed evidence and ambiguous insertion markers without writing a record', () => {
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', [
        ...required,
        '--caption',
        'out of order',
      ]),
    /must follow --evidence-title/,
  );
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', [
        ...required,
        '--evidence-title',
        'incomplete',
      ]),
    /requires filename/,
  );
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', [
        ...required,
        '--unknown',
        'value',
      ]),
    /Unknown argument/,
  );
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', required, {
        report: 'no marker',
      }),
    /missing its insertion marker/,
  );
  assert.throws(
    () =>
      runReport('create-manual-test-report.mjs', required, {
        report: common.insertionMarker.repeat(2),
      }),
    /more than one insertion marker/,
  );
});
