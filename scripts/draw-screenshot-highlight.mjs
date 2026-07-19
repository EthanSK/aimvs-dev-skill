#!/usr/bin/env node

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const black = [5, 5, 5, 255];
const yellow = [255, 235, 0, 255];
const maximumLabelLength = 120;

export function parseHighlight(value) {
  if (typeof value !== 'string') {
    throw new Error('--highlight must be left,top,width,height percentages');
  }
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => !part)) {
    throw new Error('--highlight must be left,top,width,height percentages');
  }
  const values = parts.map(Number);
  if (values.some((part) => !Number.isFinite(part))) {
    throw new Error('--highlight must contain four finite numbers');
  }
  const [left, top, width, height] = values;
  if (left < 0 || top < 0) {
    throw new Error('--highlight left and top cannot be negative');
  }
  if (width <= 0 || height <= 0) {
    throw new Error('--highlight width and height must be positive');
  }
  if (left + width > 100 || top + height > 100) {
    throw new Error('--highlight must stay inside the screenshot');
  }
  return { height, left, top, width };
}

export function parseLabel(value) {
  if (typeof value !== 'string') {
    throw new Error('--label must be a short description');
  }
  const label = value.trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('--label must be a short description');
  if (label.length > maximumLabelLength) {
    throw new Error(`--label cannot exceed ${maximumLabelLength} characters`);
  }
  return label;
}

export function parseLabelPosition(value) {
  if (typeof value !== 'string') {
    throw new Error('--label-position must be centerX,top percentages');
  }
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => !part)) {
    throw new Error('--label-position must be centerX,top percentages');
  }
  const [centerX, top] = parts.map(Number);
  if (!Number.isFinite(centerX) || !Number.isFinite(top)) {
    throw new Error('--label-position must contain two finite numbers');
  }
  if (centerX < 0 || centerX > 100 || top < 0 || top > 100) {
    throw new Error('--label-position must stay inside the screenshot');
  }
  return { centerX, top };
}

export function drawHighlightPixels({
  channels = 4,
  data,
  height,
  highlight,
  width,
}) {
  if (![3, 4].includes(channels)) {
    throw new Error('Screenshot highlights require an RGB or RGBA PNG');
  }
  const left = Math.round((width * highlight.left) / 100);
  const top = Math.round((height * highlight.top) / 100);
  const right = Math.round((width * (highlight.left + highlight.width)) / 100);
  const bottom = Math.round(
    (height * (highlight.top + highlight.height)) / 100,
  );
  const yellowThickness = Math.max(
    4,
    Math.min(10, Math.round(Math.min(width, height) / 180)),
  );
  drawStroke({
    bottom,
    channels,
    color: black,
    data,
    height,
    left,
    right,
    thickness: yellowThickness + 4,
    top,
    width,
  });
  drawStroke({
    bottom,
    channels,
    color: yellow,
    data,
    height,
    left,
    right,
    thickness: yellowThickness,
    top,
    width,
  });
  return { bottom, left, right, top };
}

export async function drawScreenshotHighlight({
  highlight,
  inputPath,
  label,
  labelPosition,
  outputPath,
}) {
  if (!inputPath.toLowerCase().endsWith('.png')) {
    throw new Error('--input must use the .png extension');
  }
  if (!outputPath.toLowerCase().endsWith('.png')) {
    throw new Error('--output must use the .png extension');
  }
  if (resolve(inputPath) === resolve(outputPath)) {
    throw new Error('--input and --output must be different files');
  }
  if (existsSync(outputPath)) {
    throw new Error(`Output already exists: ${outputPath}`);
  }

  const { data, info } = await sharp(inputPath, { ignoreIcc: true })
    .raw()
    .toBuffer({ resolveWithObject: true }); // Ignore color conversion so only the requested native RGB(A) samples change.
  const rectangle = drawHighlightPixels({
    channels: info.channels,
    data,
    height: info.height,
    highlight,
    width: info.width,
  });
  const labelRectangle = await drawLabelPixels({
    channels: info.channels,
    data,
    height: info.height,
    label,
    labelPosition,
    width: info.width,
  });
  await sharp(data, {
    raw: {
      channels: info.channels,
      height: info.height,
      width: info.width,
    },
  })
    .png()
    .toFile(outputPath);
  preservePngMetadata({ inputPath, outputPath }); // Keep the original ICC profile and other evidence metadata byte-for-byte without recoloring the screenshot.
  return {
    bytes: statSync(outputPath).size,
    height: info.height,
    labelRectangle,
    rectangle,
    width: info.width,
  };
}

export async function drawLabelPixels({
  channels,
  data,
  height,
  label,
  labelPosition,
  width,
}) {
  if (![3, 4].includes(channels)) {
    throw new Error('Screenshot labels require an RGB or RGBA PNG');
  }
  const layout = createLabelLayout({ height, label, labelPosition, width });
  const text = layout.lines
    .map(
      (line, index) =>
        `<tspan x="${layout.labelWidth / 2}" y="${layout.firstBaseline + index * layout.lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.labelWidth}" height="${layout.labelHeight}">
      <text text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${layout.fontSize}" font-weight="700" fill="#ffeb00" stroke="#050505" stroke-width="${layout.strokeWidth}" stroke-linejoin="round" paint-order="stroke fill">${text}</text>
    </svg>`,
  );
  const overlay = await sharp(svg).ensureAlpha().raw().toBuffer();
  compositePixels({
    channels,
    data,
    height,
    left: layout.left,
    overlay,
    overlayHeight: layout.labelHeight,
    overlayWidth: layout.labelWidth,
    top: layout.top,
    width,
  });
  return {
    height: layout.labelHeight,
    left: layout.left,
    top: layout.top,
    width: layout.labelWidth,
  };
}

export function createLabelLayout({ height, label, labelPosition, width }) {
  const isPortrait = height > width; // Bug: portrait screenshots used their narrow side for both font scale and label width, making review text tiny; scale from height and use more of the available width below.
  const maximumLabelWidth = Math.min(
    width - 8,
    Math.max(
      160,
      Math.min(
        isPortrait ? 840 : 520,
        Math.round(width * (isPortrait ? 0.84 : 0.42)),
      ),
    ),
  );
  const minimumFontSize = 16; // Bug: a narrow or long label could silently shrink to 10 px; reject an oversized label instead of creating unreadable evidence.
  let fontSize = Math.max(
    minimumFontSize,
    Math.min(
      isPortrait ? 40 : 26,
      Math.round((isPortrait ? height : Math.min(width, height)) / 50),
    ),
  );
  let fits = false;
  let lines;
  let horizontalPadding;
  while (fontSize >= minimumFontSize) {
    horizontalPadding = Math.max(6, Math.round(fontSize * 0.55));
    lines = wrapLabel({
      fontSize,
      label,
      maximumTextWidth: maximumLabelWidth - horizontalPadding * 2,
    });
    fits =
      lines.length <= 2 &&
      lines.every(
        (line) =>
          estimateTextWidth(line, fontSize) <=
          maximumLabelWidth - horizontalPadding * 2,
      );
    if (fits) break;
    fontSize -= 1;
  }
  if (!lines || !fits) {
    throw new Error(
      '--label is too long for readable text on this screenshot; shorten it',
    );
  }

  const lineHeight = Math.round(fontSize * 1.2);
  const verticalPadding = Math.max(4, Math.round(fontSize * 0.35));
  const labelWidth = Math.min(
    maximumLabelWidth,
    Math.ceil(
      Math.max(...lines.map((line) => estimateTextWidth(line, fontSize))) +
        horizontalPadding * 2,
    ),
  );
  const labelHeight = verticalPadding * 2 + lineHeight * lines.length;
  const left = clamp(
    Math.round((width * labelPosition.centerX) / 100 - labelWidth / 2),
    4,
    width - labelWidth - 4,
  );
  const top = clamp(
    Math.round((height * labelPosition.top) / 100),
    4,
    height - labelHeight - 4,
  );
  return {
    firstBaseline: verticalPadding + Math.round(fontSize * 0.95),
    fontSize,
    labelHeight,
    labelWidth,
    left,
    lineHeight,
    lines,
    strokeWidth: Math.max(2, Math.round(fontSize * 0.16)),
    top,
  };
}

function wrapLabel({ fontSize, label, maximumTextWidth }) {
  const lines = [];
  for (const word of label.split(' ')) {
    const current = lines.at(-1);
    const candidate = current ? `${current} ${word}` : word;
    if (
      !current ||
      estimateTextWidth(candidate, fontSize) <= maximumTextWidth
    ) {
      if (current) lines[lines.length - 1] = candidate;
      else lines.push(candidate);
    } else {
      lines.push(word);
    }
  }
  return lines;
}

function estimateTextWidth(text, fontSize) {
  return [...text].reduce(
    (width, character) =>
      width + fontSize * (/[ilI1 .,':]/.test(character) ? 0.33 : 0.61),
    0,
  );
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function compositePixels({
  channels,
  data,
  height,
  left,
  overlay,
  overlayHeight,
  overlayWidth,
  top,
  width,
}) {
  for (let y = 0; y < overlayHeight; y += 1) {
    const destinationY = top + y;
    if (destinationY < 0 || destinationY >= height) continue;
    for (let x = 0; x < overlayWidth; x += 1) {
      const destinationX = left + x;
      if (destinationX < 0 || destinationX >= width) continue;
      const overlayOffset = (y * overlayWidth + x) * 4;
      const sourceAlpha = overlay[overlayOffset + 3] / 255;
      if (sourceAlpha === 0) continue;
      const destinationOffset =
        (destinationY * width + destinationX) * channels;
      const destinationAlpha =
        channels === 4 ? data[destinationOffset + 3] / 255 : 1;
      const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
      for (let channel = 0; channel < 3; channel += 1) {
        data[destinationOffset + channel] = Math.round(
          (overlay[overlayOffset + channel] * sourceAlpha +
            data[destinationOffset + channel] *
              destinationAlpha *
              (1 - sourceAlpha)) /
            outputAlpha,
        );
      }
      if (channels === 4) {
        data[destinationOffset + 3] = Math.round(outputAlpha * 255);
      }
    }
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function drawStroke({
  bottom,
  channels,
  color,
  data,
  height,
  left,
  right,
  thickness,
  top,
  width,
}) {
  const before = Math.floor((thickness - 1) / 2);
  fillRectangle({
    color,
    channels,
    data,
    height,
    left: left - before,
    top: top - before,
    width,
    rectangleHeight: thickness,
    rectangleWidth: right - left + thickness,
  });
  fillRectangle({
    color,
    channels,
    data,
    height,
    left: left - before,
    top: bottom - before,
    width,
    rectangleHeight: thickness,
    rectangleWidth: right - left + thickness,
  });
  fillRectangle({
    color,
    channels,
    data,
    height,
    left: left - before,
    top: top - before,
    width,
    rectangleHeight: bottom - top + thickness,
    rectangleWidth: thickness,
  });
  fillRectangle({
    color,
    channels,
    data,
    height,
    left: right - before,
    top: top - before,
    width,
    rectangleHeight: bottom - top + thickness,
    rectangleWidth: thickness,
  });
}

function fillRectangle({
  channels,
  color,
  data,
  height,
  left,
  rectangleHeight,
  rectangleWidth,
  top,
  width,
}) {
  const startX = Math.max(0, left);
  const startY = Math.max(0, top);
  const endX = Math.min(width, left + rectangleWidth);
  const endY = Math.min(height, top + rectangleHeight);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * width + x) * channels;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      if (channels === 4) data[offset + 3] = color[3];
    }
  }
}

function preservePngMetadata({ inputPath, outputPath }) {
  const source = parsePng(readFileSync(inputPath), inputPath);
  const output = parsePng(readFileSync(outputPath), outputPath);
  const sourceHeader = source.chunks[0];
  const outputHeader = output.chunks[0];
  if (
    sourceHeader?.type !== 'IHDR' ||
    outputHeader?.type !== 'IHDR' ||
    !sourceHeader.raw.equals(outputHeader.raw)
  ) {
    throw new Error('Highlighted PNG changed the screenshot pixel format');
  }
  const sourceFirstImageData = source.chunks.findIndex(
    (chunk) => chunk.type === 'IDAT',
  );
  const sourceLastImageData = source.chunks.findLastIndex(
    (chunk) => chunk.type === 'IDAT',
  );
  const outputImageData = output.chunks.filter(
    (chunk) => chunk.type === 'IDAT',
  );
  const outputEnd = output.chunks.find((chunk) => chunk.type === 'IEND');
  if (
    sourceFirstImageData < 1 ||
    sourceLastImageData < sourceFirstImageData ||
    outputImageData.length === 0 ||
    !outputEnd
  ) {
    throw new Error('Screenshot PNG is missing required image data');
  }
  const sourceBeforeImageData = source.chunks.slice(1, sourceFirstImageData);
  const sourceAfterImageData = source.chunks
    .slice(sourceLastImageData + 1)
    .filter((chunk) => chunk.type !== 'IEND');
  writeFileSync(
    outputPath,
    Buffer.concat([
      output.signature,
      outputHeader.raw,
      ...sourceBeforeImageData.map((chunk) => chunk.raw),
      ...outputImageData.map((chunk) => chunk.raw),
      ...sourceAfterImageData.map((chunk) => chunk.raw),
      outputEnd.raw,
    ]),
  );
}

function parsePng(data, path) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    data.length < signature.length ||
    !data.subarray(0, 8).equals(signature)
  ) {
    throw new Error(`Not a valid PNG: ${path}`);
  }
  const chunks = [];
  let offset = signature.length;
  while (offset < data.length) {
    if (offset + 12 > data.length)
      throw new Error(`Invalid PNG chunk: ${path}`);
    const length = data.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > data.length) throw new Error(`Invalid PNG chunk: ${path}`);
    const type = data.toString('ascii', offset + 4, offset + 8);
    chunks.push({ raw: data.subarray(offset, end), type });
    offset = end;
    if (type === 'IEND') break;
  }
  if (offset !== data.length || chunks.at(-1)?.type !== 'IEND') {
    throw new Error(`Invalid PNG ending: ${path}`);
  }
  return { chunks, signature };
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!value) throw new Error(`Missing value for ${name ?? 'argument'}`);
    switch (name) {
      case '--highlight':
        options.highlight = parseHighlight(value);
        break;
      case '--input':
        options.inputPath = value;
        break;
      case '--label':
        options.label = parseLabel(value);
        break;
      case '--label-position':
        options.labelPosition = parseLabelPosition(value);
        break;
      case '--output':
        options.outputPath = value;
        break;
      default:
        throw new Error(`Unknown argument: ${name}`);
    }
  }
  if (
    !options.highlight ||
    !options.inputPath ||
    !options.label ||
    !options.labelPosition ||
    !options.outputPath
  ) {
    throw new Error(
      'Usage: draw-screenshot-highlight.mjs --input <source.png> --output <destination.png> --highlight <left,top,width,height> --label <short description> --label-position <centerX,top>',
    );
  }
  return options;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = parseOptions(process.argv.slice(2));
    const result = await drawScreenshotHighlight(options);
    const { bottom, left, right, top } = result.rectangle;
    const label = result.labelRectangle;
    console.log(
      `highlight-finished=size:${result.width}x${result.height},rectangle:${left},${top},${right - left},${bottom - top},label:${label.left},${label.top},${label.width},${label.height},bytes:${result.bytes}`,
    );
  } catch (error) {
    console.error(
      `highlight-error=${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
