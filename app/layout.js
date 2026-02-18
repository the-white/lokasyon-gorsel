export const metadata = {
  title: "Lokasyon Görsel",
  description: "İl/ilçe seçimine göre görsel üretir."
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
