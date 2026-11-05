// Deterministic Expo asset export. No redesign, stretch or symbol cropping.
// Source and cleaned matte are retained so exports can be reproduced locally.
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { generateImageAsync } = require('@expo/image-utils');
const root = path.resolve(__dirname, '..');
const asset = name => path.join(root, 'assets/images', name);
const sourcePath = asset('quickfix-brand-source.png');
const markPath = asset('quickfix-brand-mark.png');
async function resize(src, size) {
  return PNG.sync.read((await generateImageAsync({ projectRoot: root }, {
    src, width: size, height: size, resizeMode: 'contain', backgroundColor: '#00000000',
  })).source);
}
function pad(image, size) {
  const result = new PNG({ width: size, height: size });
  result.data.fill(0);
  const x = Math.floor((size - image.width) / 2), y = Math.floor((size - image.height) / 2);
  for (let row = 0; row < image.height; row++) image.data.copy(result.data, ((y + row) * size + x) * 4, row * image.width * 4, (row + 1) * image.width * 4);
  return result;
}
function write(name, image, opaque = false) {
  fs.writeFileSync(asset(name), PNG.sync.write(image, opaque ? { colorType: 2, inputHasAlpha: true } : {}));
}
async function main() {
  const source = PNG.sync.read(fs.readFileSync(sourcePath));
  const matteFlag = process.argv.indexOf('--matte');
  if (matteFlag !== -1) {
    const matte = PNG.sync.read(fs.readFileSync(process.argv[matteFlag + 1]));
    if (source.width !== matte.width || source.height !== matte.height) throw Error('Matte/source dimensions differ; refusing to distort the supplied artwork.');
    const clean = new PNG({ width: source.width, height: source.height });
    // Export QA: reject generated yellow/red fringe outside the source's orange
    // symbol, restore source colors, and retain its complete opaque core.
    for (let i = 0; i < source.data.length; i += 4) {
      const [r, g, b] = source.data.subarray(i, i + 3);
      const core = r > g + 25 && g > b + 15;
      const edge = r > g + 10 && g > b + 10;
      clean.data[i] = r; clean.data[i + 1] = g; clean.data[i + 2] = b;
      clean.data[i + 3] = core ? 255 : edge ? matte.data[i + 3] : 0;
    }
    write('quickfix-brand-mark.png', clean);
  }
  if (!fs.existsSync(markPath)) throw Error('Missing cleaned transparent brand mark.');
  write('quickfix-icon.png', await resize(sourcePath, 1024), true);
  write('quickfix-favicon.png', await resize(sourcePath, 48), true);
  // 108dp Android adaptive canvas: all nontransparent symbol pixels must fit
  // the central 66dp safe circle, preserving every part under launcher masks.
  const foreground = pad(await resize(markPath, 720), 1024);
  let outside = 0;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    if (foreground.data[(y * 1024 + x) * 4 + 3] && Math.hypot(x - 511.5, y - 511.5) > 1024 * 33 / 108) outside++;
  }
  if (outside) throw Error('Adaptive symbol extends beyond the safe circle; refusing a potentially cropped icon.');
  write('quickfix-adaptive-foreground.png', foreground);
  const monochrome = new PNG({ width: 1024, height: 1024 });
  for (let i = 0; i < foreground.data.length; i += 4) {
    monochrome.data[i] = monochrome.data[i + 1] = monochrome.data[i + 2] = 255;
    monochrome.data[i + 3] = foreground.data[i + 3];
  }
  write('quickfix-adaptive-monochrome.png', monochrome);
  write('quickfix-splash.png', await resize(markPath, 512));
  console.log('Prepared opaque 1024px app/iOS icon, safe 1024px adaptive foreground + monochrome, 512px transparent splash and 48px favicon.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
