import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow external S3 bucket images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fiorellawsbuckets.s3.eu-north-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
