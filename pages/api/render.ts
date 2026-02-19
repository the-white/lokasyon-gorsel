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

function escapeXml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST")
      return res.status(405).send("Method not allowed");

    const pid = Number(req.body?.provinceId);
    const did = Number(req.body?.districtId);

    if (!Number.isFinite(pid) || !Number.isFinite(did))
      return res.status(400).send("Geçersiz il/ilçe");

    const text = getLocationText(pid, did);

    const templatePath = path.join(process.cwd(), "public", "templates", "template.png");

    const meta = await sharp(templatePath).metadata();
    const width = meta.width ?? 1080;
    const height = meta.height ?? 1080;

    const rect = {
      x: Math.round(width * 0.40),
      y: Math.round(height * 0.88),
      w: Math.round(width * 0.60),
      h: Math.round(height * 0.32),
    };

    let fontSize = 64;
    if (text.length > 20) fontSize = 56;
    if (text.length > 26) fontSize = 48;
    if (text.length > 32) fontSize = 42;

    // Yazıyı SADECE kutu boyutunda üret
    const textPng = await sharp({
      text: {
        text: `<span foreground="black" size="${fontSize * 1000}" font_family="Red Hat Display" weight="700">${escapeXml(text)}</span>`,
        rgba: true,
        width: rect.w,
        height: rect.h,
        align: "center",
      },
    })
      .png()
      .toBuffer();

    // Debug çerçeve
    const debugRectSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}"
              fill="none" stroke="#00FF00" stroke-width="6"/>
      </svg>
    `;

    const out = await sharp(templatePath)
      .composite([
        { input: Buffer.from(debugRectSvg), top: 0, left: 0 },
        { input: textPng, top: rect.y, left: rect.x },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.status(200).send(out);
  } catch (err) {
    console.error(err);
    res.status(500).send("Render başarısız");
  }
}
