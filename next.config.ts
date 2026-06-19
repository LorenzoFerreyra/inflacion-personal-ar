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
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "geolocation=(self), camera=(), microphone=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; " +
            // 'unsafe-inline' is needed by Next.js for inline <script> tags
            // (e.g. chunk loading, next/font CSS). Using strict-dynamic
            // tells modern browsers to ignore 'unsafe-inline' and trust
            // only scripts loaded by already-allowed scripts.
            "script-src 'self' 'unsafe-inline' 'strict-dynamic'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' https: data: blob:; " +
            "connect-src 'self' https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org; " +
            "font-src 'self' data:;",
        },
      ],
    },
  ],
};

export default nextConfig;
