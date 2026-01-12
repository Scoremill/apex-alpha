import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.chart-img.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
