import type { NextConfig } from "next";

const awsBucketName =
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_BUCKET_NAME ||
  "fiorellawsbuckets";
const awsRegion = process.env.AWS_REGION || "eu-north-1";

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
        hostname: `${awsBucketName}.s3.${awsRegion}.amazonaws.com`,
        pathname: "/**",
      },
    ],
  },
  // Improve build stability
  typescript: {
    // Don't fail build on TypeScript errors during deployment
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't fail build on ESLint errors during deployment
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
