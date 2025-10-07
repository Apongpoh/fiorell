// CORS configuration for API routes
import { NextResponse } from "next/server";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function createCorsResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(),
  });
}

export function handleOptionsRequest() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}
