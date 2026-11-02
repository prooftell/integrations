// Renders the app's logo, assets/logo-512.png, the way web/scripts/icons.cjs renders the site's bitmap icons:
// the single-ink ProofTell mark (design/system/assets/Logos/prooftell-mark-ink.svg, 140 x 160) in pure black,
// centred on a square 512 x 512 transparent canvas with a 12 % margin. Make's App logo page says a PNG, square,
// 512 to 2048 px, under 500 kB; its API takes exactly 512 x 512 ("App icon must be 512x512 PNG"). Make tints the
// logo: white or transparent areas show in the app's theme colour,
// black ones white, semi-transparent ones a tint between the two. So the stem comes out white on the ProofTell
// blue and the bowl, at 50 % opacity in the source, a lighter blue. The ink (#0e1530) is swapped for #000000 so
// that Make's "black" rule applies exactly.
// Playwright and Chromium come from outside the repo, as for web/scripts/browser/ (see its README):
//   NODE_PATH=<playwright's node_modules> CH=<chromium> node scripts/logo.cjs
'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const MARGIN = Math.round(SIZE * 0.12);
const LIMIT = 500 * 1024;
const root = path.join(__dirname, '..', '..', '..');
const source = process.env.MARK || path.join(root, 'design/system/assets/Logos/prooftell-mark-ink.svg');
const target = path.join(__dirname, '..', 'assets', 'logo-512.png');

async function main() {
  const svg = fs
    .readFileSync(source, 'utf8')
    .replace(/ width="140" height="160"/, ' width="100%" height="100%"')
    .replace(/#0e1530/g, '#000000');
  const browser = await chromium.launch({ executablePath: process.env.CH });
  const page = await browser.newPage();
  await page.setViewportSize({ width: SIZE, height: SIZE });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">` +
      `<div style="width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:${MARGIN}px">${svg}</div>` +
      `</body></html>`,
  );
  const png = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
  await browser.close();
  if (png.length > LIMIT) throw new Error(`${png.length} bytes: Make's limit is ${LIMIT}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png);
  console.log(`${path.relative(process.cwd(), target)}: ${SIZE} x ${SIZE}, ${png.length} bytes`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
