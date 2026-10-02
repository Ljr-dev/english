import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necessário para a imagem Docker enxuta (standalone)
  output: "standalone",
};

export default nextConfig;
