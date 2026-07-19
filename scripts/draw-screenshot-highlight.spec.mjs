import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import {
  createLabelLayout,
  drawHighlightPixels,
  drawLabelPixels,
  drawScreenshotHighlight,
  parseHighlight,
  parseLabel,
  parseLabelPosition,
} from './draw-screenshot-highlight.mjs';

describe('screenshot highlights', () => {
  it('parses screenshot-relative percentages', () => {
    assert.deepEqual(parseHighlight('34.3, 49, 31.5, 16.5'), {
      height: 16.5,
      left: 34.3,
      top: 49,
      width: 31.5,
    });
  });

  it('normalizes an explanatory sentence', () => {
    assert.equal(
      parseLabel('  The dialog   shows the parsed error in full.  '),
      'The dialog shows the parsed error in full.',
    );
  });

  it('parses an explicit screenshot-relative label position', () => {
    assert.deepEqual(parseLabelPosition('83.5, 4'), {
      centerX: 83.5,
      top: 4,
    });
  });

  it('rejects an empty or overly long review label', () => {
    assert.throws(() => parseLabel('   '), {
      message: '--label must be a short description',
    });
    assert.throws(() => parseLabel('x'.repeat(121)), {
      message: '--label cannot exceed 120 characters',
    });
  });

  it('accepts a concise explanatory sentence', () => {
    assert.equal(
      parseLabel(
        'The notification keeps the full processing error available without covering the highlighted evidence.',
      ),
      'The notification keeps the full processing error available without covering the highlighted evidence.',
    );
  });

  for (const [value, message] of [
    ['10,20,30', '--highlight must be left,top,width,height percentages'],
    ['10,,30,40', '--highlight must be left,top,width,height percentages'],
    ['left,20,30,40', '--highlight must contain four finite numbers'],
    ['-1,20,30,40', '--highlight left and top cannot be negative'],
    ['10,20,0,40', '--highlight width and height must be positive'],
    ['80,20,30,40', '--highlight must stay inside the screenshot'],
    ['10,80,30,40', '--highlight must stay inside the screenshot'],
  ]) {
    it(`rejects ${value}`, () => {
      assert.throws(() => parseHighlight(value), { message });
    });
  }

  for (const [value, message] of [
    ['10', '--label-position must be centerX,top percentages'],
    ['10,', '--label-position must be centerX,top percentages'],
    ['left,20', '--label-position must contain two finite numbers'],
    ['-1,20', '--label-position must stay inside the screenshot'],
    ['101,20', '--label-position must stay inside the screenshot'],
    ['10,101', '--label-position must stay inside the screenshot'],
  ]) {
    it(`rejects label position ${value}`, () => {
      assert.throws(() => parseLabelPosition(value), { message });
    });
  }

  it('changes only the two-color outline pixels', () => {
    const width = 100;
    const height = 80;
    const original = Buffer.alloc(width * height * 4);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = index % 251;
    }
    const highlighted = Buffer.from(original);

    const rectangle = drawHighlightPixels({
      data: highlighted,
      height,
      highlight: parseHighlight('25,25,50,50'),
      width,
    });

    assert.deepEqual(rectangle, { bottom: 60, left: 25, right: 75, top: 20 });
    assert.deepEqual(
      readPixel(highlighted, width, 0, 0),
      readPixel(original, width, 0, 0),
    );
    assert.deepEqual(readPixel(highlighted, width, 25, 20), [255, 235, 0, 255]);
    assert.deepEqual(readPixel(highlighted, width, 25, 17), [5, 5, 5, 255]);
    assert.deepEqual(
      readPixel(highlighted, width, 50, 40),
      readPixel(original, width, 50, 40),
    );
  });

  it('places a readable label at the explicit screenshot-relative position', async () => {
    const width = 400;
    const height = 240;
    const data = Buffer.alloc(width * height * 4, 120);
    for (let offset = 3; offset < data.length; offset += 4) data[offset] = 255;

    const labelRectangle = await drawLabelPixels({
      channels: 4,
      data,
      height,
      label: parseLabel('Error details dialog'),
      labelPosition: parseLabelPosition('75,10'),
      width,
    });

    assert.equal(labelRectangle.top, 24);
    assert.ok(
      Math.abs(labelRectangle.left + labelRectangle.width / 2 - 300) <= 0.5,
    );
    assert.ok(labelRectangle.left >= 4);
    assert.ok(labelRectangle.left + labelRectangle.width <= width - 4);
    assert.ok(
      countPixels(
        data,
        width,
        ([red, green, blue]) => red > 240 && green > 210 && blue < 40,
      ) > 50,
    );
  });

  it('keeps label text readable across common screenshot dimensions', () => {
    const label = parseLabel(
      'The highlighted control keeps its full processing status visible.',
    );
    const dimensions = [
      { height: 900, minimumFontSize: 18, width: 1600 },
      { height: 1000, minimumFontSize: 20, width: 1000 },
      { height: 1600, minimumFontSize: 32, width: 900 },
      { height: 844, minimumFontSize: 16, width: 390 },
    ];

    for (const { height, minimumFontSize, width } of dimensions) {
      const layout = createLabelLayout({
        height,
        label,
        labelPosition: parseLabelPosition('50,10'),
        width,
      });

      assert.ok(layout.fontSize >= minimumFontSize);
      assert.ok(layout.lines.length <= 2);
      assert.ok(layout.left >= 4);
      assert.ok(layout.left + layout.labelWidth <= width - 4);
    }
  });

  it('rejects a label instead of shrinking it below the readable floor', () => {
    assert.throws(
      () =>
        createLabelLayout({
          height: 844,
          label: parseLabel('x'.repeat(120)),
          labelPosition: parseLabelPosition('50,10'),
          width: 390,
        }),
      {
        message:
          '--label is too long for readable text on this screenshot; shorten it',
      },
    );
  });

  it('clamps an explicit label position inside the screenshot edges', async () => {
    const width = 320;
    const height = 200;
    const data = Buffer.alloc(width * height * 4, 120);
    for (let offset = 3; offset < data.length; offset += 4) data[offset] = 255;

    const labelRectangle = await drawLabelPixels({
      channels: 4,
      data,
      height,
      label: parseLabel('Edge position'),
      labelPosition: parseLabelPosition('0,100'),
      width,
    });

    assert.equal(labelRectangle.left, 4);
    assert.equal(labelRectangle.top, height - labelRectangle.height - 4);
  });

  it('rejects unsupported label pixel formats', async () => {
    await assert.rejects(
      drawLabelPixels({
        channels: 2,
        data: Buffer.alloc(100),
        height: 10,
        label: parseLabel('Invalid channels'),
        labelPosition: parseLabelPosition('50,50'),
        width: 10,
      }),
      { message: 'Screenshot labels require an RGB or RGBA PNG' },
    );
  });

  it('changes only glyph pixels inside the returned label bounds', async () => {
    const width = 400;
    const height = 240;
    const original = Buffer.alloc(width * height * 4, 120);
    for (let offset = 3; offset < original.length; offset += 4) {
      original[offset] = 255;
    }
    const data = Buffer.from(original);

    const labelRectangle = await drawLabelPixels({
      channels: 4,
      data,
      height,
      label: parseLabel('No background block'),
      labelPosition: parseLabelPosition('50,50'),
      width,
    });
    let changedPixels = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (
          readPixel(data, width, x, y).every(
            (value, channel) =>
              value === readPixel(original, width, x, y)[channel],
          )
        ) {
          continue;
        }
        changedPixels += 1;
        assert.ok(x >= labelRectangle.left);
        assert.ok(x < labelRectangle.left + labelRectangle.width);
        assert.ok(y >= labelRectangle.top);
        assert.ok(y < labelRectangle.top + labelRectangle.height);
      }
    }
    assert.ok(changedPixels > 100);
    assert.deepEqual(
      readPixel(data, width, labelRectangle.left, labelRectangle.top),
      readPixel(original, width, labelRectangle.left, labelRectangle.top),
    );
  });

  it('rewrites a PNG with only the requested outline and label', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'aimvs-highlight-test-'));
    const inputPath = join(directory, 'input.png');
    const outputPath = join(directory, 'output.png');
    const width = 640;
    const height = 480;
    const original = Buffer.alloc(width * height * 4);
    for (let index = 0; index < original.length; index += 1) {
      original[index] = index % 251;
    }
    for (let offset = 3; offset < original.length; offset += 4) {
      original[offset] = 255;
    }
    try {
      await sharp(original, { raw: { channels: 4, height, width } })
        .png()
        .withMetadata({ density: 144, icc: 'p3' })
        .toFile(inputPath);
      const source = await sharp(inputPath, { ignoreIcc: true })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const sourceMetadata = await sharp(inputPath).metadata();
      const highlight = parseHighlight('25,25,50,50');

      const label = parseLabel('Round trip label');
      const labelPosition = parseLabelPosition('50,5');
      const result = await drawScreenshotHighlight({
        highlight,
        inputPath,
        label,
        labelPosition,
        outputPath,
      });

      const { data, info } = await sharp(outputPath, { ignoreIcc: true })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const outputMetadata = await sharp(outputPath).metadata();
      const expected = Buffer.from(source.data);
      drawHighlightPixels({ data: expected, height, highlight, width });
      await drawLabelPixels({
        channels: 4,
        data: expected,
        height,
        label,
        labelPosition,
        width,
      });
      assert.equal(info.width, width);
      assert.equal(info.height, height);
      assert.deepEqual(data, expected);
      assert.equal(outputMetadata.density, sourceMetadata.density);
      assert.deepEqual(outputMetadata.icc, sourceMetadata.icc);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});

function readPixel(data, width, x, y) {
  const offset = (y * width + x) * 4;
  return [...data.subarray(offset, offset + 4)];
}

function countPixels(data, width, predicate) {
  let count = 0;
  const height = data.length / 4 / width;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (predicate(readPixel(data, width, x, y))) count += 1;
    }
  }
  return count;
}
