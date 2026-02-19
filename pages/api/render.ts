import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import path from "path";
import fs from "fs";
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

function escapeXml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const pid = Number(req.body?.provinceId);
    const did = Number(req.body?.districtId);
    if (!Number.isFinite(pid) || !Number.isFinite(did)) {
      return res.status(400).send("Geçersiz il/ilçe");
    }

    const text = getLocationText(pid, did);

    const templatePath = path.join(process.cwd(), "public", "templates", "template.png");
    const meta = await sharp(templatePath).metadata();
    const width = meta.width ?? 1080;
    const height = meta.height ?? 1080;

    // Yazı alanı (alt bant)
    const rect = {
      x: Math.round(width * 0.10),
      y: Math.round(height * 0.88),
      w: Math.round(width * 0.80),
      h: Math.round(height * 0.08),
    };

    // Debug çerçeve
    const debugRectSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"
              fill="none" stroke="#00FF00" stroke-width="6"/>
      </svg>
    `;

    const fontFile = path.join(process.cwd(), "public/fonts/RedHatDisplay-Bold.ttf");
    if (!fs.existsSync(fontFile)) {
      return res.status(500).send("Font bulunamadı");
    }

    const fontBase64 = fs.readFileSync(fontFile).toString("base64");

    let lines = text.length > 16 ? wrapText(text, 16).slice(0, 2) : [text];
    if (lines.length > 2) lines = lines.slice(0, 2);

    const fontSizes = [64, 56, 48, 42];
    let fontSize = fontSizes[0];
    if (text.length > 20) fontSize = fontSizes[1];
    if (text.length > 26) fontSize = fontSizes[2];
    if (text.length > 32) fontSize = fontSizes[3];

    const pangoSvg = `
      <svg width="${rect.w}" height="${rect.h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @font-face {
              font-family: 'RedHatDisplay';
              src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
              font-weight: 700;
            }
          </style>
        </defs>

        <rect width="100%" height="100%" fill="transparent"/>

        <text x="${rect.w / 2}" y="${rect.h / 2}"
              text-anchor="middle"
              dominant-baseline="middle"
              font-family="RedHatDisplay"
              font-size="${fontSize}"
              font-weight="700"
              fill="#ffffff"
              stroke="#000000"
              stroke-width="6"
              paint-order="stroke fill">
          ${lines.map((ln, i) => {
            const dy = (i - (lines.length - 1) / 2) * Math.round(fontSize * 1.15);
            return `<tspan x="${rect.w / 2}" dy="${i === 0 ? dy : Math.round(fontSize * 1.15)}">${escapeXml(ln)}</tspan>`;
          }).join("")}
        </text>
      </svg>
    `;

    const textPng = await sharp(Buffer.from(pangoSvg))
      .png()
      .toBuffer();

    const out = await sharp(templatePath)
      .composite([
        { input: Buffer.from(debugRectSvg), top: 0, left: 0 },
        { input: textPng, top: rect.y, left: rect.x }
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.status(200).send(out);

  } catch (e: any) {
    res.status(500).send(e?.message || "Render error");
  }
}
