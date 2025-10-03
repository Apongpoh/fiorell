import { NextResponse } from "next/server";

const placeholderProfile = (background = "#E5E7EB", text = "#94A3B8") => {
  return `
    <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${background}"/>
      <path d="M200 180C227.614 180 250 157.614 250 130C250 102.386 227.614 80 200 80C172.386 80 150 102.386 150 130C150 157.614 172.386 180 200 180Z" fill="${text}"/>
      <path d="M312 320C312 276.101 261.275 240 200 240C138.725 240 88 276.101 88 320" stroke="${text}" stroke-width="20" stroke-linecap="round"/>
    </svg>
  `;
};

// Placeholder profile SVG endpoint (no request object needed)
export async function GET() {
  const svg = placeholderProfile();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
