import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow rendering SVGs in Next/Image (used by /api/placeholder/profile)
    dangerouslyAllowSVG: true,
    // Optional: tighten CSP for SVGs to reduce XSS risk from inline scripts
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
