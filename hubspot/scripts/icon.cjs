// Renders the marketplace listing's icon, assets/listing-icon-800.png: the ProofTell mark
// (design/system/assets/Logos/prooftell-mark.svg, 140 x 160) on a square 800 x 800 transparent canvas, as tall as
// the canvas, so that it touches the top and bottom edges: HubSpot asks for 800 x 800, JPG or PNG, an image that
// fills the space and touches at least two edges, no text, no wordmark, no whitespace around it. The app's own logo
// (512 x 512, with a margin) is Zapier's, copied by build.mjs. Playwright and Chromium come from outside the repo,
// as for web/scripts/browser/ (see its README):
//   NODE_PATH=<playwright's node_modules> CH=<chromium> node scripts/icon.cjs
'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZE = 800;
const root = path.join(__dirname, '..', '..', '..');
const source = path.join(root, 'design/system/assets/Logos/prooftell-mark.svg');
const target = path.join(__dirname, '..', 'assets', 'listing-icon-800.png');

async function main() {
  const svg = fs.readFileSync(source, 'utf8').replace(/ width="140" height="160"/, ` height="${SIZE}"`);
  const browser = await chromium.launch({ executablePath: process.env.CH });
  const page = await browser.newPage();
  await page.setViewportSize({ width: SIZE, height: SIZE });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">` +
      `<div style="width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center">${svg}</div>` +
      `</body></html>`,
  );
  const png = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
  await browser.close();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png);
  console.log(`${path.relative(process.cwd(), target)}: ${png.length} bytes`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
