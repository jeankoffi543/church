import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5000mb',
    },
    // The proxy (middleware) buffers request bodies; raise the cap so bulk photo
    // uploads (up to 50 images) aren't truncated at the 10MB default.
    proxyClientMaxBodySize: '500mb',
  },
};

export default nextConfig;
