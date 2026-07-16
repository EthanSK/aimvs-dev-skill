#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import {
  assertSafeRelativeFilename,
  getRepoRoot,
  readReportSource,
  reportGuardrail,
  resolveReportWorkspace,
  writeFileAtomically,
} from './manual-test-report-common.mjs';

const entryMarker = '<!-- aimvs-manual-test-entry -->';
const validResults = new Set(['passed', 'failed', 'partial', 'blocked']);

export async function renderManualTestReport(workspace) {
  const source = readReportSource(workspace.sourcePath);
  const title = source.match(/^#\s+(.+)$/m)?.[1] ?? 'Manual Test Results';
  const entries = source.split(entryMarker).slice(1).map(parseEntry);
  const html = buildHtml({ entries, title, workspace });
  writeFileAtomically(workspace.htmlPath, html);
  return workspace.htmlPath;
}

function parseEntry(rawEntry, index) {
  const metadataMatch = rawEntry.match(/^\s*```yaml\n([\s\S]*?)\n```\s*/);
  if (!metadataMatch) {
    throw new Error(
      `Manual-test entry ${index + 1} is missing its YAML metadata block`,
    );
  }
  const metadata = parseMetadata(metadataMatch[1]);
  if (!validResults.has(metadata.result)) {
    throw new Error(
      `Manual-test entry ${index + 1} has invalid result: ${metadata.result}`,
    );
  }
  const markdown = rawEntry.slice(metadataMatch[0].length).trim();
  const entryTitle =
    markdown.match(/^##\s+(.+)$/m)?.[1] ?? `Test run ${index + 1}`;
  return {
    html: marked.parse(markdown),
    metadata,
    title: entryTitle,
  };
}

function parseMetadata(yaml) {
  const metadata = { areas: [], proofs: [] };
  let arrayKey;
  for (const line of yaml.split('\n')) {
    const arrayMatch = line.match(/^([a-z_]+):$/);
    if (arrayMatch) {
      arrayKey = arrayMatch[1];
      metadata[arrayKey] = [];
      continue;
    }
    if (arrayKey && line.startsWith('  - ')) {
      metadata[arrayKey].push(parseScalar(line.slice(4)));
      continue;
    }
    arrayKey = undefined;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    metadata[line.slice(0, separator)] = parseScalar(
      line.slice(separator + 1).trim(),
    );
  }
  return metadata;
}

function parseScalar(value) {
  if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
    return JSON.parse(value);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function buildHtml({ entries, title, workspace }) {
  const latest = entries[0];
  const proofPairCount = entries.reduce(
    (count, entry) => count + (entry.metadata.proofs?.length ?? 0),
    0,
  );
  const counts = Object.fromEntries(
    [...validResults].map((result) => [
      result,
      entries.filter((entry) => entry.metadata.result === result).length,
    ]),
  );
  const areas = [...new Set(entries.flatMap((entry) => entry.metadata.areas))];
  const latestResult = latest?.metadata.result ?? 'blocked';
  const latestConfidence =
    latest?.metadata.confidence ??
    'No manual-test sessions have been reported yet.';
  const generatedAt = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #070a0f;
      --panel: rgba(18, 24, 34, .78);
      --panel-solid: #121822;
      --line: rgba(255, 255, 255, .1);
      --text: #f4f7fb;
      --muted: #9ca9ba;
      --passed: #62e6a7;
      --failed: #ff6b77;
      --partial: #ffc866;
      --blocked: #a991ff;
      --accent: #74c7ff;
      --radius: 22px;
      --shadow: 0 24px 80px rgba(0, 0, 0, .36);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at 8% 4%, rgba(116, 199, 255, .14), transparent 30rem),
        radial-gradient(circle at 92% 16%, rgba(98, 230, 167, .1), transparent 28rem),
        var(--bg);
      font: 15px/1.65 Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .28;
      background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
      background-size: 32px 32px;
      mask-image: linear-gradient(to bottom, black, transparent 75%);
    }
    a { color: var(--accent); }
    button, summary { font: inherit; }
    .shell { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: 52px 0 88px; }
    .eyebrow { color: var(--accent); font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    .hero {
      position: relative;
      overflow: hidden;
      padding: clamp(28px, 5vw, 56px);
      border: 1px solid var(--line);
      border-radius: 30px;
      background: linear-gradient(145deg, rgba(23,31,44,.96), rgba(11,15,22,.9));
      box-shadow: var(--shadow); /* Bug: file previews can capture opacity animations before the verdict appears; render evidence immediately and reserve motion for interaction transitions. */
    }
    .hero::after {
      content: "";
      position: absolute;
      width: 340px;
      height: 340px;
      right: -120px;
      top: -180px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--${latestResult}) 22%, transparent);
      filter: blur(14px);
    }
    h1 { max-width: 850px; margin: 14px 0 18px; font-size: clamp(34px, 6vw, 66px); line-height: 1.02; letter-spacing: -.045em; }
    .verdict { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 7px 12px;
      border: 1px solid color-mix(in srgb, var(--status-color) 45%, transparent);
      border-radius: 999px;
      color: var(--status-color);
      background: color-mix(in srgb, var(--status-color) 11%, transparent);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .status::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 18px currentColor; }
    .status-passed { --status-color: var(--passed); }
    .status-failed { --status-color: var(--failed); }
    .status-partial { --status-color: var(--partial); }
    .status-blocked { --status-color: var(--blocked); }
    .confidence { max-width: 760px; margin: 18px 0 0; color: #d7dfea; font-size: clamp(16px, 2vw, 20px); }
    .guardrail { margin: 24px 0 0; color: var(--muted); font-size: 13px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0 0; }
    .metric { padding: 18px 20px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); backdrop-filter: blur(14px); }
    .metric strong { display: block; font-size: 30px; line-height: 1; }
    .metric span { color: var(--muted); font-size: 12px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
    .toolbar { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin: 42px 0 16px; }
    .toolbar h2 { margin: 0; font-size: 24px; letter-spacing: -.02em; }
    .toolbar-actions { display: flex; gap: 8px; }
    .toolbar button, .source-link { padding: 9px 13px; border: 1px solid var(--line); border-radius: 11px; color: var(--text); background: rgba(255,255,255,.045); text-decoration: none; cursor: pointer; }
    .runs { display: grid; gap: 16px; }
    .run { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); box-shadow: 0 14px 46px rgba(0,0,0,.2); overflow: hidden; }
    .run > summary { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding: 20px 22px; cursor: pointer; list-style: none; }
    .run > summary::-webkit-details-marker { display: none; }
    .run > summary::before { content: "+"; display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--line); border-radius: 10px; color: var(--muted); transition: transform .2s ease; }
    .run[open] > summary::before { transform: rotate(45deg); }
    .run-title { min-width: 0; }
    .run-title strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; }
    .run-title span { color: var(--muted); font-size: 13px; }
    .run-body { padding: 0 22px 24px; border-top: 1px solid var(--line); }
    .proofs { display: grid; gap: 28px; padding-top: 24px; }
    .proof { overflow: hidden; border: 1px solid var(--line); border-radius: 20px; background: rgba(5,8,12,.72); }
    .proof-header { padding: 22px 24px; border-bottom: 1px solid var(--line); }
    .proof-header h3 { margin: 0 0 5px; font-size: clamp(20px, 3vw, 28px); letter-spacing: -.025em; }
    .proof-statement { margin: 0; color: #dce7f5; font-size: clamp(15px, 2vw, 19px); }
    .proof-statement strong { color: var(--passed); }
    .comparison { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 20px; }
    .shot { min-width: 0; }
    .shot-label { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; color: var(--muted); font-size: 12px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
    .shot-label::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .shot-open { display: block; width: 100%; overflow: hidden; padding: 0; border: 1px solid var(--line); border-radius: 14px; background: #020304; cursor: pointer; }
    .shot-open:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
    .shot img { display: block; width: 100%; height: auto; }
    .shot figcaption { margin-top: 10px; color: #bdc8d7; font-size: 14px; }
    .image-viewer { width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: clamp(28px, 5vw, 70px); border: 0; color: var(--text); background: rgba(2, 4, 8, .96); cursor: pointer; }
    .image-viewer[open] { display: grid; place-items: center; }
    .image-viewer::backdrop { background: rgba(0, 0, 0, .82); backdrop-filter: blur(8px); }
    .image-viewer img { display: block; max-width: 100%; max-height: calc(100dvh - clamp(56px, 10vw, 140px)); border-radius: 14px; object-fit: contain; box-shadow: var(--shadow); }
    .image-viewer-close { position: fixed; top: 16px; right: 18px; display: grid; place-items: center; width: 42px; height: 42px; padding: 0; border: 1px solid var(--line); border-radius: 50%; color: var(--text); background: rgba(255,255,255,.08); cursor: pointer; }
    .image-viewer-hint { position: fixed; bottom: 14px; left: 50%; margin: 0; color: var(--muted); font-size: 12px; transform: translateX(-50%); }
    body.image-viewer-open { overflow: hidden; }
    .comparison-arrow { display: grid; place-items: center; width: 58px; height: 58px; margin: 0 auto; border: 1px solid rgba(116,199,255,.3); border-radius: 50%; color: var(--accent); background: rgba(116,199,255,.09); font-size: 30px; box-shadow: 0 0 34px rgba(116,199,255,.12); transform: rotate(90deg); }
    .run-details { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(280px, .75fr); gap: 22px; }
    .evidence { min-width: 0; padding-top: 12px; }
    .evidence h2 { display: none; }
    .evidence h3 { margin: 28px 0 10px; font-size: 18px; }
    .evidence h4 { margin: 22px 0 8px; color: #e8eef6; }
    .evidence p, .evidence li { color: #c2ccda; }
    .evidence code { padding: .16em .42em; border-radius: 6px; color: #dff6ff; background: rgba(116,199,255,.1); font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .evidence pre { overflow: auto; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: #090d13; }
    .evidence pre code { padding: 0; background: none; }
    .media { align-self: start; position: sticky; top: 16px; margin-top: 24px; padding: 16px; border: 1px solid var(--line); border-radius: 18px; background: rgba(5,8,12,.72); }
    .media-label { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; color: var(--muted); font-size: 12px; font-weight: 780; letter-spacing: .08em; text-transform: uppercase; }
    video { display: block; width: 100%; border-radius: 12px; background: #020304; aspect-ratio: 16 / 10; }
    .no-evidence { display: grid; place-items: center; min-height: 180px; padding: 24px; border: 1px dashed var(--line); border-radius: 12px; color: var(--muted); text-align: center; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
    .meta div { min-width: 0; padding: 10px; border-radius: 10px; background: rgba(255,255,255,.035); }
    .meta dt { color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    .meta dd { overflow: hidden; margin: 2px 0 0; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .areas { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
    .tag { padding: 7px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: rgba(255,255,255,.035); font-size: 12px; }
    footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 32px; color: var(--muted); font-size: 12px; }
    @media (max-width: 840px) {
      .summary-grid { grid-template-columns: 1fr 1fr; }
      .run-details { grid-template-columns: 1fr; }
      .media { position: static; }
    }
    @media (max-width: 560px) {
      .shell { width: min(100% - 20px, 1180px); padding-top: 18px; }
      .hero { padding: 24px; border-radius: 22px; }
      .toolbar { align-items: flex-start; flex-direction: column; }
      .run > summary { grid-template-columns: auto 1fr; }
      .run > summary .status { grid-column: 2; }
      .meta { grid-template-columns: 1fr; }
      footer { flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">AIMVS · Manual verification</div>
      <h1>${escapeHtml(title.replace(/ Manual Test Results$/, ''))}</h1>
      <div class="verdict">
        ${statusBadge(latestResult, `Latest: ${latestResult}`)}
        <span>${entries.length} test run${entries.length === 1 ? '' : 's'} · ${proofPairCount} before/after proof pair${proofPairCount === 1 ? '' : 's'}</span>
      </div>
      <p class="confidence">${escapeHtml(latestConfidence)}</p>
      <p class="guardrail">${escapeHtml(reportGuardrail)}</p>
      <div class="areas">${areas.map((area) => `<span class="tag">${escapeHtml(area)}</span>`).join('')}</div>
    </section>

    <section class="summary-grid" aria-label="Result counts">
      ${metric('Passed', counts.passed)}
      ${metric('Failed', counts.failed)}
      ${metric('Partial', counts.partial)}
      ${metric('Blocked', counts.blocked)}
    </section>

    <div class="toolbar">
      <h2>Test runs</h2>
      <div class="toolbar-actions">
        <button type="button" data-action="expand">Expand all</button>
        <button type="button" data-action="collapse">Collapse all</button>
        <a class="source-link" href="./manual-test-results.md">View source</a>
      </div>
    </div>

    <section class="runs">
      ${entries.map((entry, index) => renderEntry(entry, index, workspace)).join('\n') || '<div class="no-evidence">No test runs have been added yet.</div>'}
    </section>

    <footer>
      <span>Generated ${escapeHtml(generatedAt)} · self-contained reviewer report</span>
      <span>${escapeHtml(workspace.directoryName)}</span>
    </footer>
  </main>
  <dialog class="image-viewer" data-image-viewer aria-label="Full-size screenshot">
    <button class="image-viewer-close" type="button" data-action="close-image-viewer" aria-label="Close full-size screenshot">×</button>
    <img data-image-viewer-image alt="">
    <p class="image-viewer-hint">Click anywhere or press Escape to close</p>
  </dialog>
  <script>
    const runs = [...document.querySelectorAll('.run')];
    document.querySelector('[data-action="expand"]')?.addEventListener('click', () => runs.forEach((run) => { run.open = true; }));
    document.querySelector('[data-action="collapse"]')?.addEventListener('click', () => runs.forEach((run) => { run.open = false; }));
    const imageViewer = document.querySelector('[data-image-viewer]');
    const imageViewerImage = document.querySelector('[data-image-viewer-image]');
    let imageViewerTrigger;
    const closeImageViewer = () => {
      if (!imageViewer?.open) return;
      imageViewer.close();
    };
    document.querySelectorAll('[data-image-viewer-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        imageViewerTrigger = trigger;
        imageViewerImage.src = trigger.dataset.imageViewerSrc;
        imageViewerImage.alt = trigger.dataset.imageViewerAlt;
        document.body.classList.add('image-viewer-open');
        imageViewer.showModal(); // Keep the report URL and scroll position; direct PNG navigation gets trapped in the browser's zoom view.
      });
    });
    imageViewer?.addEventListener('click', closeImageViewer);
    imageViewer?.addEventListener('close', () => {
      document.body.classList.remove('image-viewer-open');
      imageViewerImage.removeAttribute('src');
      imageViewerImage.alt = '';
      imageViewerTrigger?.focus();
      imageViewerTrigger = undefined;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !imageViewer?.open) return;
      event.preventDefault();
      closeImageViewer();
    });
  </script>
</body>
</html>`;
}

function renderEntry(entry, index, workspace) {
  const { metadata } = entry;
  const proofs = metadata.proofs ?? [];
  const recording = metadata.recording;
  let legacyRecording = '';
  if (recording) {
    assertSafeRelativeFilename(recording, 'recording metadata');
    const exists = existsSync(resolve(workspace.reportDirectory, recording));
    const video = exists
      ? `<video controls preload="metadata" src="./${encodeURIComponent(recording)}"></video>`
      : `<div class="no-evidence">The referenced legacy recording is missing:<br><code>${escapeHtml(recording)}</code></div>`;
    legacyRecording = `<div class="legacy-recording">
      <div class="media-label"><span>Legacy session recording</span><span>MP4</span></div>
      ${video}
    </div>`;
  }
  const proofsHtml = proofs.length
    ? `
      <section class="proofs" aria-label="Before and after visual proof">${proofs.map((proof, proofIndex) => renderProof(proof, proofIndex, workspace)).join('')}</section>`
    : '';
  const noVisualEvidence =
    proofs.length === 0 && !recording
      ? '<div class="no-evidence">No visual proof is attached to this blocked, automated-only, or legacy run.</div>'
      : '';
  return `<details class="run" ${index === 0 ? 'open' : ''}>
    <summary>
      <div class="run-title">
        <strong>${escapeHtml(entry.title)}</strong>
        <span>${escapeHtml(formatEntryDate(metadata.date))} · ${escapeHtml(metadata.browser ?? 'Unknown browser')}</span>
      </div>
      ${statusBadge(metadata.result, metadata.result)}
    </summary>
    <div class="run-body">${proofsHtml}
      <div class="run-details">
        <article class="evidence">${entry.html}</article>
        <aside class="media">
          <div class="media-label"><span>Evidence summary</span><span>${proofs.length} proof pair${proofs.length === 1 ? '' : 's'}</span></div>${noVisualEvidence}${legacyRecording}
          <dl class="meta">
            ${metadataItem('Branch', metadata.branch)}
            ${metadataItem('Git state', metadata.working_tree)}
            ${metadataItem('Stack', metadata.stack)}
            ${metadataItem('Base commit', metadata.base_commit?.slice(0, 10))}
          </dl>
        </aside>
      </div>
    </div>
  </details>`;
}

function renderProof(proof, index, workspace) {
  for (const field of [
    'title',
    'before',
    'beforeCaption',
    'after',
    'afterCaption',
    'proves',
  ]) {
    if (typeof proof?.[field] !== 'string' || !proof[field].trim()) {
      throw new Error(`Visual proof ${index + 1} is missing ${field}`);
    }
  }
  assertSafeRelativeFilename(proof.before, `visual proof ${index + 1} before image`);
  assertSafeRelativeFilename(proof.after, `visual proof ${index + 1} after image`);
  return `<article class="proof">
    <header class="proof-header">
      <h3>${escapeHtml(proof.title)}</h3>
      <p class="proof-statement"><strong>What this proves:</strong> ${escapeHtml(proof.proves)}</p>
    </header>
    <div class="comparison">
      ${renderScreenshot('Before', proof.before, proof.beforeCaption, workspace)}
      <div class="comparison-arrow" aria-hidden="true">→</div>
      ${renderScreenshot('After', proof.after, proof.afterCaption, workspace)}
    </div>
  </article>`;
}

function renderScreenshot(label, filename, caption, workspace) {
  const exists = existsSync(resolve(workspace.reportDirectory, filename));
  const content = exists
    ? `<button class="shot-open" type="button" data-image-viewer-trigger data-image-viewer-src="./${encodeURIComponent(filename)}" data-image-viewer-alt="${escapeHtml(`${label}: ${caption}`)}" title="Open the full-size ${escapeHtml(label.toLowerCase())} screenshot" aria-label="Open the full-size ${escapeHtml(label.toLowerCase())} screenshot"><img loading="lazy" src="./${encodeURIComponent(filename)}" alt="${escapeHtml(`${label}: ${caption}`)}"></button>`
    : `<div class="no-evidence">The referenced screenshot is missing:<br><code>${escapeHtml(filename)}</code></div>`;
  return `<figure class="shot">
    <div class="shot-label">${escapeHtml(label)}</div>
    ${content}
    <figcaption>${escapeHtml(caption)}</figcaption>
  </figure>`;
}

function formatEntryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? 'Unknown date';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusBadge(result, label) {
  return `<span class="status status-${escapeHtml(result)}">${escapeHtml(label)}</span>`;
}

function metric(label, value) {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
}

function metadataItem(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd title="${escapeHtml(value ?? '—')}">${escapeHtml(value ?? '—')}</dd></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const workspace = resolveReportWorkspace({
    create: false,
    repoRoot: getRepoRoot(),
    slug: undefined,
  });
  console.log(await renderManualTestReport(workspace));
}
