import * as assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readUntrackedFingerprintContents } from './manual-test-report-common.mjs';

void describe('manual test report fingerprints', () => {
  void it('reads regular untracked files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'aimvs-report-fingerprint-'));

    try {
      const filePath = join(directory, 'result.txt');
      writeFileSync(filePath, 'manual test evidence');

      assert.equal(
        readUntrackedFingerprintContents(filePath).toString(),
        'manual test evidence',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  void it('fingerprints an untracked directory symlink without traversing it', () => {
    const directory = mkdtempSync(join(tmpdir(), 'aimvs-report-fingerprint-'));

    try {
      mkdirSync(join(directory, 'target'));
      symlinkSync('target', join(directory, 'linked-directory'), 'dir');

      assert.equal(
        readUntrackedFingerprintContents(
          join(directory, 'linked-directory'),
        ).toString(),
        'symlink\0target',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
