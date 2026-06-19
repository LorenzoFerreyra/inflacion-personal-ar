import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supermarket domains
      { protocol: "https", hostname: "**.jumbo.com.ar" },
      { protocol: "https", hostname: "**.disco.com.ar" },
      { protocol: "https", hostname: "**.vea.com.ar" },
      { protocol: "https", hostname: "**.cotodigital3.com.ar" },
      { protocol: "https", hostname: "**.carrefour.com.ar" },
      { protocol: "https", hostname: "**.dia.com.ar" },
      { protocol: "https", hostname: "**.changomas.com.ar" },
      // CDNs used by Argentine supermarkets
      { protocol: "https", hostname: "**.vteximg.com.br" },
      { protocol: "https", hostname: "**.vtexassets.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
};

export default nextConfig;
