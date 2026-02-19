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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const pid = Number(req.body?.provinceId);
    const did = Number(req.body?.districtId);

    if (!Number.isFinite(pid) || !Number.isFinite(did)) return res.status(400).send("Geçersiz il/ilçe");

    const text = getLocationText(pid, did);

    const templatePath = path.join(process.cwd(), "public", "templates", "template.png");
    const fontFile = path.join(process.cwd(), "public", "fonts", "RedHatDisplay-Bold.ttf");

    const meta = await sharp(templatePath).metadata();
    const width = meta.width ?? 1080;
    const height = meta.height ?? 1080;

    const rect = {
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.88),
      w: Math.round(width * 0.8),
      h: Math.round(height * 0.08),
    };

    let fontSize = 64;
    if (text.length > 20) fontSize = 56;
    if (text.length > 26) fontSize = 48;
    if (text.length > 32) fontSize = 42;

    const textPng = await sharp({
      text: {
        text,
        font: "Red Hat Display Bold",
        fontfile: fontFile,
        width: rect.w,
        height: rect.h,
        align: "center",
        rgba: true,
        dpi: 300,
      },
    })
      .png()
      .toBuffer();

    const out = await sharp(templatePath)
      .composite([{ input: textPng, top: rect.y, left: rect.x }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.status(200).send(out);
  } catch (err) {
    console.error(err);
    res.status(500).send("Render başarısız");
  }
}
