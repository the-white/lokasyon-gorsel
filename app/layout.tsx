export const metadata = {
  title: "İl / İlçe Görsel Üretici",
  description: "Şablon görselin bandına il/ilçe yazıp görsel üretir."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
