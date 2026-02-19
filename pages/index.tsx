"use client";

import { useMemo, useState } from "react";
import { provinces, districts } from "../data/locations";

export default function Home() {
  const [provinceId, setProvinceId] = useState<number>(provinces[0].id);
  const [districtId, setDistrictId] = useState<number>(districts[provinces[0].id][0].id);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const districtOptions = useMemo(() => districts[provinceId] ?? [], [provinceId]);

  const onGenerate = async () => {
    setLoading(true);
    setImageUrl(null);

    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provinceId, districtId }),
    });

   if (!res.ok) {
  const t = await res.text().catch(() => "");
  alert("Render başarısız: " + t);
  setLoading(false);
  return;
}


    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>İl / İlçe Görsel Üretici</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          İl:
          <select
            value={provinceId}
            onChange={(e) => {
              const pid = Number(e.target.value);
              setProvinceId(pid);
              const first = (districts[pid] ?? [])[0];
              if (first) setDistrictId(first.id);
            }}
            style={{ marginLeft: 8 }}
          >
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          İlçe:
          <select
            value={districtId}
            onChange={(e) => setDistrictId(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          >
            {districtOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <button onClick={onGenerate} disabled={loading} style={{ padding: "10px 12px" }}>
          {loading ? "Oluşturuluyor..." : "Görseli Oluştur"}
        </button>

        {imageUrl && (
          <div style={{ marginTop: 16 }}>
            <img src={imageUrl} alt="Üretilen görsel" style={{ width: "100%", borderRadius: 10 }} />
            <a
              href={imageUrl}
              download={`gorsel-${provinceId}-${districtId}.png`}
              style={{ display: "inline-block", marginTop: 12 }}
            >
              İndir
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
