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
  // Ensure proper SSR handling for admin and subscription pages
  experimental: {
    esmExternals: false,
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
  // Optimize for Vercel deployment
  swcMinify: true,
};

export default nextConfig;
