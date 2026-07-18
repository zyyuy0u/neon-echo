import {
  CanvasTexture,
  ClampToEdgeWrapping,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

export interface PixelTexture {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
}

export interface WindowTexture extends PixelTexture {
  readonly columns: number;
  readonly rows: number;
}

export const WINDOW_WARM = [255, 137, 63, 255] as const;
export const WINDOW_CYAN = [0, 229, 255, 255] as const;
export const ROAD_CENTER = [255, 211, 25, 255] as const;
export const FACADE_WINDOW_COLUMNS = 16;
export const FACADE_WINDOW_ROWS = 40;

function randomStep(state: number): number {
  let value = state | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function setPixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: readonly [number, number, number, number],
): void {
  if (x < 0 || y < 0 || x >= width) return;
  const index = (y * width + x) * 4;
  if (index < 0 || index + 3 >= pixels.length) return;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function fillRect(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  rectangleWidth: number,
  rectangleHeight: number,
  color: readonly [number, number, number, number],
): void {
  const startX = Math.max(0, Math.floor(x));
  const endX = Math.min(width, Math.ceil(x + rectangleWidth));
  const startY = Math.max(0, Math.floor(y));
  const endY = Math.min(height, Math.ceil(y + rectangleHeight));
  for (let pixelY = startY; pixelY < endY; pixelY += 1) {
    for (let pixelX = startX; pixelX < endX; pixelX += 1) {
      setPixel(pixels, width, pixelX, pixelY, color);
    }
  }
}

function renderWindowTexture(
  seed: number,
  width: number,
  height: number,
  columns: number,
  rows: number,
): WindowTexture {
  const pixels = new Uint8ClampedArray(width * height * 4);
  fillRect(pixels, width, height, 0, 0, width, height, [7, 12, 30, 255]);

  const cellWidth = width / columns;
  const cellHeight = height / rows;
  let state = (seed || 1) >>> 0;
  const litTarget = Math.round(columns * rows * (0.36 + (seed % 17) / 100));
  const ranked = Array.from({ length: columns * rows }, (_, index) => {
    state = randomStep(state + index + 1);
    return { index, rank: state };
  }).sort((a, b) => a.rank - b.rank);
  const lit = new Set(ranked.slice(0, litTarget).map((entry) => entry.index));

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = column * cellWidth;
      const y = row * cellHeight;
      fillRect(
        pixels,
        width,
        height,
        x + 1,
        y + 1,
        cellWidth - 2,
        cellHeight - 2,
        [12, 24, 48, 255],
      );
      if (!lit.has(index)) continue;
      const color = (index + seed) % 4 === 0 ? WINDOW_WARM : WINDOW_CYAN;
      fillRect(
        pixels,
        width,
        height,
        x + cellWidth * 0.2,
        y + cellHeight * 0.22,
        cellWidth * 0.6,
        cellHeight * 0.5,
        color,
      );
    }
  }
  return { width, height, pixels, columns, rows };
}

export function generateWindowTexture(
  seed: number,
  width = 128,
  height = 256,
): WindowTexture {
  return renderWindowTexture(seed, width, height, 10, 18);
}

export function generateFacadeWindowTexture(seed: number): WindowTexture {
  return renderWindowTexture(
    seed,
    256,
    512,
    FACADE_WINDOW_COLUMNS,
    FACADE_WINDOW_ROWS,
  );
}

const SIGN_COLORS = [
  [0, 229, 255, 255],
  [255, 46, 196, 255],
  [255, 211, 25, 255],
  [255, 107, 53, 255],
] as const;

export function generateSignTexture(
  seed: number,
  width = 128,
  height = 64,
): PixelTexture {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const variant = Math.abs(seed) % 8;
  const primary = SIGN_COLORS[variant % SIGN_COLORS.length]!;
  const secondary = SIGN_COLORS[(variant + 1) % SIGN_COLORS.length]!;
  fillRect(pixels, width, height, 0, 0, width, height, [5, 7, 24, 248]);

  const border = 2 + (variant % 3);
  fillRect(pixels, width, height, 0, 0, width, border, primary);
  fillRect(pixels, width, height, 0, height - border, width, border, primary);
  fillRect(pixels, width, height, 0, 0, border, height, primary);
  fillRect(pixels, width, height, width - border, 0, border, height, primary);

  const glyphCount = 3 + (variant % 4);
  const glyphWidth = Math.floor((width - 20) / glyphCount);
  for (let glyph = 0; glyph < glyphCount; glyph += 1) {
    const x = 10 + glyph * glyphWidth;
    const top = 13 + ((variant + glyph) % 3) * 3;
    const color = glyph % 2 === 0 ? primary : secondary;
    const mode = (variant + glyph) % 4;
    fillRect(pixels, width, height, x, top, 3, 35, color);
    if (mode !== 1)
      fillRect(pixels, width, height, x, top, glyphWidth - 5, 3, color);
    if (mode !== 2)
      fillRect(pixels, width, height, x, top + 16, glyphWidth - 5, 3, color);
    if (mode !== 3)
      fillRect(pixels, width, height, x, top + 32, glyphWidth - 5, 3, color);
    if (mode === 0 || mode === 3)
      fillRect(pixels, width, height, x + glyphWidth - 8, top, 3, 35, color);
  }

  for (let stripe = 0; stripe <= variant; stripe += 1) {
    const x = 7 + stripe * 13;
    fillRect(pixels, width, height, x, 6, 7, 2, secondary);
  }
  return { width, height, pixels };
}

export function generateRoadTexture(
  seed: number,
  width = 128,
  height = 256,
): PixelTexture {
  const pixels = new Uint8ClampedArray(width * height * 4);
  fillRect(pixels, width, height, 0, 0, width, height, [8, 11, 21, 255]);

  for (let y = 0; y < height; y += 1) {
    const noise = ((y * 31 + seed * 17) % 13) + 10;
    for (let x = 0; x < width; x += 11) {
      setPixel(pixels, width, (x + y * 3) % width, y, [
        noise,
        noise + 3,
        noise + 8,
        255,
      ]);
    }
  }

  const edge = [0, 229, 255, 255] as const;
  fillRect(pixels, width, height, 8, 0, 3, height, edge);
  fillRect(pixels, width, height, width - 11, 0, 3, height, edge);
  for (let y = 0; y < height; y += 32) {
    fillRect(pixels, width, height, width / 2 - 2, y, 4, 18, ROAD_CENTER);
  }

  for (const crosswalkY of [22, height - 42]) {
    for (let x = 17; x < width - 17; x += 12) {
      fillRect(
        pixels,
        width,
        height,
        x,
        crosswalkY,
        7,
        20,
        [205, 224, 232, 255],
      );
    }
  }
  return { width, height, pixels };
}

export function createCanvasTexture(
  texture: PixelTexture,
  repeat = false,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = texture.width;
  canvas.height = texture.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is required for city textures.');
  context.putImageData(
    new ImageData(
      new Uint8ClampedArray(texture.pixels),
      texture.width,
      texture.height,
    ),
    0,
    0,
  );
  const canvasTexture = new CanvasTexture(canvas);
  canvasTexture.colorSpace = SRGBColorSpace;
  canvasTexture.magFilter = NearestFilter;
  canvasTexture.minFilter = NearestFilter;
  canvasTexture.wrapS = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  canvasTexture.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  canvasTexture.needsUpdate = true;
  return canvasTexture;
}
