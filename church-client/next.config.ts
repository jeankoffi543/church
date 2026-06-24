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
  // URL normalisation: legacy snake_case admin route → kebab-case, with a
  // permanent (308) redirect so existing bookmarks keep working.
  async redirects() {
    return [
      { source: "/admins/home_groups", destination: "/admins/home-groups", permanent: true },
      { source: "/admins/home_groups/:path*", destination: "/admins/home-groups/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
