#!/usr/bin/env node
/**
 * Render a static PNG of the Widgetizer hero isometric-cube mosaic effect.
 *
 * Usage:
 *   node scripts/render-hero-mosaic.js [output.png] [width] [height] [options]
 *
 * Options (--key=value):
 *   --bg=#0b0b10            background color
 *   --fill=#ffffff          cube fill color (matches --fill CSS var)
 *   --accent=#e60076        accent color (matches --accent CSS var)
 *   --cubes=120             cube count (defaults scale with area)
 *   --frames=900            simulation frames to run before capturing
 *   --seed=42               PRNG seed for reproducible output
 *   --no-content-zone       don't dim cubes in the center "content" area
 *   --transparent           transparent background (overrides --bg)
 *
 * Examples:
 *   node scripts/render-hero-mosaic.js bg.png 1920 1080
 *   node scripts/render-hero-mosaic.js bg.png 1920 1080 --bg=#000 --accent=#22d3ee --cubes=180
 *   node scripts/render-hero-mosaic.js bg.png 2560 1440 --transparent --frames=1500
 */

import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ---------- arg parsing ----------

const argv = process.argv.slice(2);
const positional = [];
const opts = {};
for (const a of argv) {
  if (a.startsWith("--")) {
    const eq = a.indexOf("=");
    if (eq === -1) opts[a.slice(2)] = true;
    else opts[a.slice(2, eq)] = a.slice(eq + 1);
  } else {
    positional.push(a);
  }
}

const outPath = resolve(positional[0] || "hero-mosaic.png");
const width = parseInt(positional[1] || "1920", 10);
const height = parseInt(positional[2] || "1080", 10);

const bg = opts.transparent ? null : opts.bg || "#0b0b10";
const fillColor = opts.fill || "#ffffff";
const accentColor = opts.accent || "#e60076";
const useContentZone = !opts["no-content-zone"];

// Defaults scale with area (original was 50 cubes for ~1280x720).
const defaultCount = Math.round(50 * (width * height) / (1280 * 720));
const CUBE_COUNT = parseInt(opts.cubes || String(defaultCount), 10);
const FRAMES = parseInt(opts.frames || "250", 10);
const seed = parseInt(opts.seed || "42", 10);

// ---------- seeded PRNG (mulberry32) ----------

let seedState = seed >>> 0;
function rand() {
  seedState = (seedState + 0x6D2B79F5) >>> 0;
  let t = seedState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------- color helpers ----------

function parseHex(hex) {
  hex = hex.replace("#", "");
  const full =
    hex.length === 3 ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : hex;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  };
}

const fillRgb = parseHex(fillColor);
const accentRgb = parseHex(accentColor);

// ---------- simulation (ported from hero-mosaic.js) ----------

// Cube size scales with the smaller dimension so it looks consistent across resolutions.
const sizeScale = Math.min(width, height) / 720;
const MAX_SIZE = 60 * sizeScale;
const FADE_SIZE = 52 * sizeScale;
const SPAWN_SIZE_MIN = 12 * sizeScale;
const SPAWN_SIZE_MAX = 28 * sizeScale;

function isInContentZone(x, y) {
  if (!useContentZone) return false;
  const marginX = width * 0.22;
  const marginBottom = height * 0.25;
  return x > marginX && x < width - marginX && y < height - marginBottom;
}

function createCube() {
  let x = rand() * width;
  const edge = Math.floor(rand() * 4);
  let y;
  if (edge === 0) y = -30;
  else if (edge === 1) y = height + 30;
  else if (edge === 2) {
    x = -30;
    y = rand() * height;
  } else {
    x = width + 30;
    y = rand() * height;
  }

  const inCenter = isInContentZone(x, height * 0.5);
  const size = SPAWN_SIZE_MIN + rand() * (SPAWN_SIZE_MAX - SPAWN_SIZE_MIN);
  const speed = (0.12 + rand() * 0.2) * sizeScale;
  const dir = rand() < 0.5 ? 1 : -1;
  const isoAngle = rand() < 0.5;
  return {
    x,
    y,
    size,
    vx: (isoAngle ? speed : -speed) * dir,
    vy: speed * 0.577 * (edge === 1 ? -1 : 1),
    opacity: 0,
    opacityTarget: inCenter
      ? 0.025 + rand() * 0.03
      : 0.06 + rand() * 0.07,
    floatPhase: rand() * Math.PI * 2,
    floatSpeed: 0.0005 + rand() * 0.001,
    floatAmp: (3 + rand() * 10) * sizeScale,
    parallax: 0.3 + rand() * 1.4,
    heightRatio: 0.5 + rand() * 0.3,
    accent: rand() < 0.04,
    alive: true,
    fading: false,
  };
}

let cubes = [];
function init() {
  cubes = [];
  for (let i = 0; i < CUBE_COUNT; i++) {
    const c = createCube();
    c.x = rand() * width;
    c.y = rand() * height;
    c.opacity = c.opacityTarget;
    cubes.push(c);
  }
}

function step() {
  const maxV = 1.0 * sizeScale;
  for (let i = 0; i < cubes.length; i++) {
    const c = cubes[i];
    if (!c.alive) continue;

    if (c.vx > maxV) c.vx = maxV;
    if (c.vx < -maxV) c.vx = -maxV;
    if (c.vy > maxV) c.vy = maxV;
    if (c.vy < -maxV) c.vy = -maxV;

    c.x += c.vx;
    c.y += c.vy;

    if (
      c.x < -c.size * 3 ||
      c.x > width + c.size * 3 ||
      c.y < -c.size * 3 ||
      c.y > height + c.size * 3
    ) {
      c.alive = false;
    }

    if (!c.fading && c.opacity < c.opacityTarget) {
      c.opacity += 0.0005;
      if (c.opacity > c.opacityTarget) c.opacity = c.opacityTarget;
    }

    if (c.size >= FADE_SIZE) c.fading = true;
    if (c.fading) {
      c.opacity -= 0.001;
      if (c.opacity <= 0) c.alive = false;
    }
  }

  for (let i = 0; i < cubes.length; i++) {
    const a = cubes[i];
    if (!a.alive || a.fading) continue;
    for (let j = i + 1; j < cubes.length; j++) {
      const b = cubes[j];
      if (!b.alive || b.fading) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const mergeDist = (a.size + b.size) * 0.5;
      const pullDist = (a.size + b.size) * 2.5;

      if (dist < mergeDist) {
        if (a.size >= b.size) {
          a.size = Math.min(a.size + b.size * 0.35, MAX_SIZE);
          a.vy = (a.vy + b.vy) * 0.5;
          b.alive = false;
        } else {
          b.size = Math.min(b.size + a.size * 0.35, MAX_SIZE);
          b.vy = (a.vy + b.vy) * 0.5;
          a.alive = false;
        }
        break;
      } else if (dist < pullDist && dist > 0) {
        const absDx = Math.abs(dx);
        if (absDx < (a.size + b.size) * 1.5) {
          const force = 0.015 * (1 - dist / pullDist);
          const nx = dx / dist;
          const ny = dy / dist;
          a.vx += nx * force * 0.8;
          a.vy += ny * force * 0.3;
          b.vx -= nx * force * 0.8;
          b.vy -= ny * force * 0.3;
        }
      }
    }
  }

  for (let i = 0; i < cubes.length; i++) {
    if (!cubes[i].alive) cubes[i] = createCube();
  }
}

// ---------- rendering ----------

function toIso(x, y, z) {
  return { sx: (x - y) * 0.866, sy: (x + y) * 0.5 - z };
}

function drawCube(ctx, cx, cy, s, hRatio, isAccent, alpha) {
  const rgb = isAccent ? accentRgb : fillRgb;
  const r = rgb.r;
  const g = rgb.g;
  const b = rgb.b;
  const h = s * hRatio;

  ctx.globalAlpha = alpha;

  // top
  let p0 = toIso(0, 0, h);
  let p1 = toIso(s, 0, h);
  let p2 = toIso(s, s, h);
  let p3 = toIso(0, s, h);
  ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
  ctx.beginPath();
  ctx.moveTo(cx + p0.sx, cy + p0.sy);
  ctx.lineTo(cx + p1.sx, cy + p1.sy);
  ctx.lineTo(cx + p2.sx, cy + p2.sy);
  ctx.lineTo(cx + p3.sx, cy + p3.sy);
  ctx.closePath();
  ctx.fill();

  // right
  p0 = toIso(s, 0, h);
  p1 = toIso(s, s, h);
  p2 = toIso(s, s, 0);
  p3 = toIso(s, 0, 0);
  ctx.fillStyle = `rgba(${r},${g},${b},0.45)`;
  ctx.beginPath();
  ctx.moveTo(cx + p0.sx, cy + p0.sy);
  ctx.lineTo(cx + p1.sx, cy + p1.sy);
  ctx.lineTo(cx + p2.sx, cy + p2.sy);
  ctx.lineTo(cx + p3.sx, cy + p3.sy);
  ctx.closePath();
  ctx.fill();

  // bottom
  p0 = toIso(0, 0, 0);
  p1 = toIso(s, 0, 0);
  p2 = toIso(s, s, 0);
  p3 = toIso(0, s, 0);
  ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
  ctx.beginPath();
  ctx.moveTo(cx + p0.sx, cy + p0.sy);
  ctx.lineTo(cx + p1.sx, cy + p1.sy);
  ctx.lineTo(cx + p2.sx, cy + p2.sy);
  ctx.lineTo(cx + p3.sx, cy + p3.sy);
  ctx.closePath();
  ctx.fill();

  // left
  p0 = toIso(0, 0, h);
  p1 = toIso(0, s, h);
  p2 = toIso(0, s, 0);
  p3 = toIso(0, 0, 0);
  ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
  ctx.beginPath();
  ctx.moveTo(cx + p0.sx, cy + p0.sy);
  ctx.lineTo(cx + p1.sx, cy + p1.sy);
  ctx.lineTo(cx + p2.sx, cy + p2.sy);
  ctx.lineTo(cx + p3.sx, cy + p3.sy);
  ctx.closePath();
  ctx.fill();
}

function render() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  cubes.sort((a, b) => a.y + a.x * 0.5 - (b.y + b.x * 0.5));

  const time = FRAMES * 16;
  for (let i = 0; i < cubes.length; i++) {
    const c = cubes[i];
    if (!c.alive) continue;
    const wobY = Math.sin(time * c.floatSpeed + c.floatPhase) * c.floatAmp;
    const drawOpacity = Math.max(0, c.opacity);
    drawCube(ctx, c.x, c.y + wobY, c.size, c.heightRatio, c.accent, drawOpacity);
  }

  ctx.globalAlpha = 1;
  return canvas.toBuffer("image/png");
}

// ---------- main ----------

console.log(
  `Rendering ${width}x${height} → ${outPath}\n` +
    `  cubes=${CUBE_COUNT}  frames=${FRAMES}  seed=${seed}\n` +
    `  bg=${bg || "transparent"}  fill=${fillColor}  accent=${accentColor}`,
);

const t0 = Date.now();
init();
for (let i = 0; i < FRAMES; i++) step();
const buf = render();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);
console.log(`Done in ${Date.now() - t0}ms (${(buf.length / 1024).toFixed(1)} KB)`);
