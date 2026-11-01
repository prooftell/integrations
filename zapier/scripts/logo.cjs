// Renders the listing's logo, assets/logo-512.png: the ProofTell mark (design/system/assets/Logos/
// prooftell-mark.svg, 140 x 160) centred on a square 512 x 512 transparent canvas, with a 12 % margin, the way
// web/scripts/icons.cjs renders the site's bitmap icons. Zapier asks for a square PNG of at least 256 x 256.
// Playwright and Chromium come from outside the repo, as for web/scripts/browser/ (see its README):
//   NODE_PATH=<playwright's node_modules> CH=<chromium> node scripts/logo.cjs
'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const MARGIN = Math.round(SIZE * 0.12);
const root = path.join(__dirname, '..', '..', '..');
const source = process.env.MARK || path.join(root, 'design/system/assets/Logos/prooftell-mark.svg');
const target = path.join(__dirname, '..', 'assets', 'logo-512.png');

async function main() {
  const svg = fs.readFileSync(source, 'utf8').replace(/ width="140" height="160"/, ' width="100%" height="100%"');
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
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png);
  console.log(`${path.relative(process.cwd(), target)}: ${png.length} bytes`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
