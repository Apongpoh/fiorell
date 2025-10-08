import { NextRequest, NextResponse } from "next/server";
import { getCryptoService } from "@/lib/cryptoService";

// Get current cryptocurrency prices
export async function GET(request: NextRequest) {
  try {
    const cryptoService = getCryptoService();
    
    const { searchParams } = new URL(request.url);
    const currencies = searchParams.get("currencies")?.split(",") || ["bitcoin", "monero"];
    
    const prices: Record<string, number> = {};
    
    // Fetch prices for requested currencies
    for (const currency of currencies) {
      if (["bitcoin", "monero"].includes(currency)) {
        try {
          prices[currency] = await cryptoService.getCurrentPrice(currency);
        } catch (error) {
          console.error(`Failed to fetch ${currency} price:`, error);
          // Fallback prices in case of API failure
          prices[currency] = currency === "bitcoin" ? 45000 : 150;
        }
      }
    }
    
    return NextResponse.json({
      prices,
      timestamp: new Date().toISOString(),
      source: "coingecko",
    });
    
  } catch (error) {
    console.error("Crypto prices API error:", error);
    
    // Return fallback prices
    return NextResponse.json({
      prices: {
        bitcoin: 45000,
        monero: 150,
      },
      timestamp: new Date().toISOString(),
      source: "fallback",
      error: "Unable to fetch live prices",
    });
  }
}

// Get historical price data for charts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      cryptocurrency,
      days = 7,
      interval = "daily"
    } = body;
    
    if (!["bitcoin", "monero"].includes(cryptocurrency)) {
      return NextResponse.json(
        { error: "Invalid cryptocurrency" },
        { status: 400 }
      );
    }
    
    // This would typically fetch from a price history API
    // For now, generate mock historical data
    const mockHistoricalData = generateMockPriceHistory(cryptocurrency, days);
    
    return NextResponse.json({
      cryptocurrency,
      days,
      interval,
      data: mockHistoricalData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Historical price data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}

function generateMockPriceHistory(cryptocurrency: string, days: number) {
  const basePrice = cryptocurrency === "bitcoin" ? 45000 : 150;
  const data = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Generate realistic price fluctuation
    const fluctuation = (Math.random() - 0.5) * 0.1; // ±10% max
    const price = basePrice * (1 + fluctuation);
    
    data.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }
  
  return data;
}