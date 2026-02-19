import fs from "fs";

import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import path from "path";
import { provinces, districts } from "../../data/locations";

function getLocationText(provinceId: number, districtId: number) {
  const p = provinces.find((x) => x.id === provinceId)?.name ?? "";
  const d = (districts[provinceId] ?? []).find((x) => x.id === districtId)?.name ?? "";
  if (p && d) return `${d} / ${p}`;
  return d || p || "Seçim yok";
}

function wrapText(text: string, maxCharsPerLine: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxCharsPerLine) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const fontPath = path.join(process.cwd(), "public/fonts/RedHatDisplay-Bold.ttf");
const fontData = fs.readFileSync(fontPath);
const fontBase64 = fontData.toString("base64");



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const pid = Number(req.body?.provinceId);
  const did = Number(req.body?.districtId);
  if (!Number.isFinite(pid) || !Number.isFinite(did)) return res.status(400).send("Geçersiz il/ilçe");

  const text = getLocationText(pid, did);

  const templatePath = path.join(process.cwd(), "public", "templates", "template.png");
  const meta = await sharp(templatePath).metadata();
  const width = meta.width ?? 1080;
  const height = meta.height ?? 1080;

 const rect = {
  x: Math.round(width * 0.10),
  y: Math.round(height * 0.88),
  w: Math.round(width * 0.80),
  h: Math.round(height * 0.08),
};

  const fontSizes = [64, 56, 48, 42];

  let lines = text.length > 16 ? wrapText(text, 16).slice(0, 2) : [text];
  if (lines.length > 2) lines = lines.slice(0, 2);

  const svgFor = (fontSize: number) => {
    const lineHeight = Math.round(fontSize * 1.15);
    const totalH = lineHeight * lines.length;
    const startY = rect.y + Math.round((rect.h - totalH) / 2) + Math.round(lineHeight / 2);

    const tspans = lines
      .map((ln, i) => {
        const y = startY + i * lineHeight;
        const safe = ln.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        return `<tspan x="${rect.x + Math.round(rect.w / 2)}" y="${y}">${safe}</tspan>`;
      })
      .join("");

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
  @font-face {
    font-family: 'RedHatDisplay';
    src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
    font-weight: bold;
  }

  .t {
    font-family: 'RedHatDisplay', sans-serif;
    font-weight: bold;
    font-size: ${fontSize}px;
    fill: #ffffff;
    stroke: #000000;
    stroke-width: 6px;
    paint-order: stroke fill;
  }
</style>

        <text class="t" text-anchor="middle" dominant-baseline="middle">
          ${tspans}
        </text>
      </svg>
    `;
  };

  let chosen = fontSizes[0];
  if (text.length > 20) chosen = fontSizes[1];
  if (text.length > 26) chosen = fontSizes[2];
  if (text.length > 32) chosen = fontSizes[3];

  const out = await sharp(templatePath)
    .composite([{ input: Buffer.from(svgFor(chosen)), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="gorsel-${pid}-${did}.png"`);
  res.status(200).send(out);
}
