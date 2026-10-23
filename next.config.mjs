/** @type {import('next').NextConfig} */
// GitHub Pages için statik çıktı; repo adı NEXT_PUBLIC_BASE_PATH ile verilir (ör. /arsa-analiz).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};
