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
  env: {
    FRED_API_KEY: process.env.FRED_API_KEY,
  },
};

export default nextConfig;
