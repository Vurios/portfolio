/* Build a 1600x1000 gallery slide showing 1-3 phone mockups.
 *
 * Portrait app screenshots look wrong in the site's landscape gallery frame:
 * letterboxed to slivers at card size. This composes them into one landscape
 * slide instead, on the project's brand colour.
 *
 * This is an authoring tool, run by hand when screenshots change. It is not
 * part of the site build: the site itself has no build step and no
 * dependencies. Nothing it produces is needed at runtime.
 *
 * Needs, on the machine and not in this repo:
 *   - Playwright        npx playwright install chromium
 *   - Python + Pillow   for the WebP encode (python -m pip install pillow)
 * Point --browser at an existing Chromium if Playwright's own is missing.
 *
 * Usage:
 *   node scripts/make-phone-slide.mjs \
 *     --out assets/images/projects/saro/06-mobile-app.webp \
 *     --bg "#1e2d6b" \
 *     --shot path/to/a.png --shot path/to/b.png --shot path/to/c.png
 *
 * Options:
 *   --out <path>       output file; .webp encodes through Python, .png does not
 *   --bg <#hex>        backdrop colour, the project's brand colour
 *   --shot <path>      repeat 1-3 times, in left-to-right order
 *   --browser <path>   Chromium executable, if Playwright's own is absent
 *   --quality <n>      WebP quality, default 82
 *   --keep-png         keep the intermediate PNG next to the output
 *
 * Environment:
 *   PLAYWRIGHT_PATH    a node_modules directory holding playwright, when it
 *                      is not installed alongside this repo
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/* Playwright deliberately is not a dependency of this repo. Take it from
   wherever it already lives: installed here, or a node_modules directory
   named by PLAYWRIGHT_PATH. */
async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    const dir = process.env.PLAYWRIGHT_PATH;
    if (!dir) {
      throw new Error(
        "Playwright not found. Either `npm i -D playwright` somewhere on this " +
          "machine and set PLAYWRIGHT_PATH to that node_modules directory, or " +
          "run this script from a directory that has it installed."
      );
    }
    // Reached this way playwright is a CommonJS module, so its exports may
    // arrive under `default` rather than as named ones.
    const mod = await import(pathToFileURL(path.join(dir, "playwright", "index.js")).href);
    return mod.chromium || (mod.default && mod.default.chromium);
  }
}

const W = 1600;
const H = 1000;
// Middle phone of three, or a lone phone, fills this share of the frame
// height; the outer two sit a step smaller so the middle reads as in front.
const LEAD_SHARE = 0.86;
const SIDE_SHARE = 0.74;
const PAIR_SHARE = 0.84;
// How much of an outer phone the one in front covers. Small: each screen has
// to stay readable at card size, so neighbours only just touch.
const OVERLAP_PAIR = 0.07;
const OVERLAP_TRIO = 0.05;
const GAP = 26; // px between phones that do not overlap

function parseArgs(argv) {
  const out = { shots: [], quality: 82 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--shot") out.shots.push(argv[++i]);
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--bg") out.bg = argv[++i];
    else if (a === "--browser") out.browser = argv[++i];
    else if (a === "--quality") out.quality = parseInt(argv[++i], 10);
    else if (a === "--keep-png") out.keepPng = true;
    else throw new Error("unknown option: " + a);
  }
  if (!out.out) throw new Error("--out is required");
  if (!out.bg) throw new Error("--bg is required");
  if (!out.shots.length || out.shots.length > 3) throw new Error("--shot must be given 1 to 3 times");
  return out;
}

/* Read a PNG/JPEG header for its pixel size, so each screenshot keeps its own
   aspect ratio and is never cropped, stretched or letterboxed. */
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error("cannot read the size of " + file);
}

function phoneHtml(shots, bg) {
  const n = shots.length;
  const share = n === 1 ? LEAD_SHARE : n === 2 ? PAIR_SHARE : null;
  // Three phones: the middle one leads, the outer two step back.
  const heights = shots.map((_, i) => {
    if (share) return Math.round(H * share);
    return Math.round(H * (i === 1 ? LEAD_SHARE : SIDE_SHARE));
  });

  const cards = shots
    .map((s, i) => {
      const { w, h } = imageSize(s.file);
      const bezel = Math.max(8, Math.round(heights[i] * 0.014));
      const screenH = heights[i] - bezel * 2;
      const screenW = Math.round((screenH * w) / h);
      const radius = Math.round(heights[i] * 0.055);
      // The middle phone of three sits in front of its neighbours.
      const z = n === 3 ? (i === 1 ? 3 : 1) : 1;
      const share_ = n === 3 ? OVERLAP_TRIO : OVERLAP_PAIR;
      const pull = i === 0 ? 0 : Math.round(GAP - screenW * share_);
      return `
      <div class="phone" style="
        z-index:${z};
        margin-left:${pull}px;
        padding:${bezel}px;
        border-radius:${radius}px;
      ">
        <img src="${s.url}" width="${screenW}" height="${screenH}"
             style="width:${screenW}px;height:${screenH}px;border-radius:${Math.round(radius * 0.62)}px" />
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; }
  body {
    background: ${bg};
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  /* Subtle radial lift, brightest behind the phones. */
  .vignette {
    position: fixed; inset: 0;
    background:
      radial-gradient(ellipse 70% 62% at 50% 46%, rgba(255,255,255,0.13), rgba(255,255,255,0) 68%),
      radial-gradient(ellipse 120% 100% at 50% 120%, rgba(0,0,0,0.34), rgba(0,0,0,0) 62%);
  }
  .row { position: relative; display: flex; align-items: center; }
  /* Generic handset: near-black bezel, even on all sides, no notch, no brand. */
  .phone {
    position: relative;
    background: #0b0b0d;
    box-shadow:
      0 2px 0 rgba(255,255,255,0.10) inset,
      0 28px 60px -18px rgba(0,0,0,0.62),
      0 8px 20px -10px rgba(0,0,0,0.45);
  }
  .phone img { display: block; object-fit: fill; }
</style></head>
<body><div class="vignette"></div><div class="row">${cards}</div></body></html>`;
}

const args = parseArgs(process.argv);
const shots = args.shots.map((f) => {
  const file = path.resolve(f);
  if (!fs.existsSync(file)) throw new Error("no such screenshot: " + f);
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  return { file, url: `data:${mime};base64,${fs.readFileSync(file).toString("base64")}` };
});

const outPath = path.resolve(args.out);
const wantsWebp = path.extname(outPath).toLowerCase() === ".webp";
const pngPath = wantsWebp ? outPath.replace(/\.webp$/i, ".png") : outPath;
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch(args.browser ? { executablePath: args.browser } : {});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(phoneHtml(shots, args.bg), { waitUntil: "load" });
await page.waitForTimeout(200);
await page.screenshot({ path: pngPath });
await browser.close();

if (wantsWebp) {
  const py = `
import sys
from PIL import Image
src, dst, q = sys.argv[1], sys.argv[2], int(sys.argv[3])
Image.open(src).convert("RGB").save(dst, "WEBP", quality=q, method=6)
`;
  const r = spawnSync("python", ["-c", py, pngPath, outPath, String(args.quality)], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error("WebP encode failed; the PNG is at " + pngPath);
  }
  if (!args.keepPng) fs.unlinkSync(pngPath);
}

const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`${path.relative(process.cwd(), outPath)}  ${W}x${H}  ${kb} KB  (${shots.length} phone${shots.length > 1 ? "s" : ""})`);
