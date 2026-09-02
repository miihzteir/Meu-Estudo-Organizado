import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Meu-Estudo-Organizado",
  assetPrefix: "/Meu-Estudo-Organizado",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
