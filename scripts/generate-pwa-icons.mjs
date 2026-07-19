import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const PRIMARY = "#7C6CF6";

function svgIcon(size) {
  const fontSize = Math.round(size * 0.4);
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${PRIMARY}" />
  <text
    x="50%"
    y="50%"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="#FFFFFF"
  >LB</text>
</svg>`;
}

async function generate(size) {
  const outFile = path.join(outDir, `icon-${size}.png`);
  await sharp(Buffer.from(svgIcon(size))).png().toFile(outFile);
  console.log(`Generated ${outFile}`);
}

await generate(192);
await generate(512);
