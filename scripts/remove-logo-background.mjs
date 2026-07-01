import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/images/FLYLRE2.jpg");
const output = path.join(__dirname, "../public/images/FLYLRE2.png");

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const threshold = 248;
const edgeSoftness = 12;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  const minChannel = Math.min(r, g, b);
  const maxChannel = Math.max(r, g, b);
  const whiteness = minChannel;
  const saturation = maxChannel - minChannel;

  /* Keep colored pixels; only remove near-white background */
  if (whiteness >= threshold && saturation < 28) {
    data[i + 3] = 0;
  } else if (whiteness >= threshold - edgeSoftness && saturation < 40) {
    const fade = (threshold - whiteness) / edgeSoftness;
    data[i + 3] = Math.round(Math.max(0, Math.min(255, fade * 255)));
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim({ threshold: 10 })
  .png({ compressionLevel: 9 })
  .toFile(output);

const finalMeta = await sharp(output).metadata();
console.log(`Saved transparent logo: ${output} (${finalMeta.width}x${finalMeta.height})`);
