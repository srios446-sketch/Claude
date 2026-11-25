// Genera los íconos de la PWA y el logo de la interfaz a partir de BRAND.logoFuente.
// Uso: npm run icons
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const brandSrc = readFileSync(resolve('src/config/brand.ts'), 'utf8');
const fuente = brandSrc.match(/logoFuente:\s*'([^']+)'/)[1];
const fondo = brandSrc.match(/colorFondo:\s*'([^']+)'/)[1];

const RECORTE = 0.032;   // quita el marco claro del logo (≈3% por lado)
const RADIO = 0.10;      // esquinas redondeadas del arte

const img = sharp(resolve(fuente));
const { width, height } = await img.metadata();
const lado = Math.min(width, height);
const inset = Math.round(lado * RECORTE);
const recorte = await img
  .extract({ left: inset, top: inset, width: lado - 2 * inset, height: lado - 2 * inset })
  .png().toBuffer();

async function redondeado(size) {
  const r = Math.round(size * RADIO);
  const mascara = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
  return sharp(recorte).resize(size, size).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
}
async function sobreFondo(size, escala) {
  const interno = Math.round(size * escala);
  const arte = await redondeado(interno);
  const off = Math.round((size - interno) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: fondo } })
    .composite([{ input: arte, left: off, top: off }]).png().toBuffer();
}

const salidas = [
  ['public/icons/icon-192.png', await redondeado(192)],
  ['public/icons/icon-512.png', await redondeado(512)],
  ['public/icons/maskable-512.png', await sobreFondo(512, 0.8)],
  ['public/icons/apple-touch-icon.png', await sobreFondo(180, 1)],
  ['public/icons/favicon-32.png', await redondeado(32)],
  ['public/brand/logo.png', await redondeado(256)],
];
for (const [ruta, buf] of salidas) {
  await sharp(buf).png({ compressionLevel: 9, palette: true, quality: 85 }).toFile(resolve(ruta));
  console.log('✓', ruta);
}
