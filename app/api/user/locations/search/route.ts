import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";

interface LocationData {
  originalCity: string;
  city: string;
  country: string;
  coordinates: [number, number];
  userCount: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication - we need this for security but don't use userId in this endpoint
    verifyAuth(request);

    const url = new URL(request.url);
    const query = url.searchParams.get("query");

    if (!query || query.length < 3) {
      return NextResponse.json({
        locations: []
      });
    }

    // Search for locations using simple find query  
    const cityRegex = new RegExp(query, "i");
    
    const users = await User.find({
      $and: [
        { 
          "location.city": { 
            $exists: true, 
            $nin: [null, ""] 
          } 
        },
        {
          "location.city": { $regex: cityRegex }
        }
      ]
    }).select("location").limit(100);

    // Group by unique city combinations
    const locationMap = new Map<string, LocationData>();

    users.forEach(user => {
      if (user.location?.city) {
        const cityName = user.location.city;
        const key = cityName.toLowerCase();
        
        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          existing.userCount++;
        } else {
          // Parse city field to extract city and country if possible
          const cityParts = cityName.split(',').map((part: string) => part.trim());
          const city = cityParts[0] || cityName;
          const country = cityParts.length > 1 ? cityParts[cityParts.length - 1] : '';
          
          locationMap.set(key, {
            originalCity: cityName, // Keep original format
            city: city,
            country: country,
            coordinates: user.location.coordinates || [0, 0],
            userCount: 1
          });
        }
      }
    });

    // Convert to array and sort by popularity
    const locations = Array.from(locationMap.values())
      .sort((a: LocationData, b: LocationData) => b.userCount - a.userCount || a.city.localeCompare(b.city))
      .slice(0, 20);

    // Format coordinates properly and add fallback coordinates for major cities
    const formattedLocations = locations.map((location: LocationData) => {
      let coordinates = location.coordinates;
      
      // If coordinates are [0,0] or invalid, try to provide fallback coordinates for major cities
      if (!coordinates || (coordinates[0] === 0 && coordinates[1] === 0)) {
        coordinates = getFallbackCoordinates(location.originalCity);
      }

      return {
        city: location.originalCity, // Use the original city format from database
        country: location.country || '', // May be empty if not parsed
        coordinates: coordinates as [number, number],
        userCount: location.userCount
      };
    });

    return NextResponse.json({
      locations: formattedLocations
    });

  } catch (error) {
    console.error("Location search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Fallback coordinates for major cities when user data doesn't have coordinates
function getFallbackCoordinates(cityString: string): [number, number] {
  const cityKey = cityString.toLowerCase();
  
  const fallbackCoordinates: { [key: string]: [number, number] } = {
    "new york": [-74.006, 40.7128],
    "new york, ny": [-74.006, 40.7128], 
    "new york, usa": [-74.006, 40.7128],
    "new york, united states": [-74.006, 40.7128],
    "london": [-0.1276, 51.5074],
    "london, uk": [-0.1276, 51.5074],
    "london, united kingdom": [-0.1276, 51.5074],
    "paris": [2.3522, 48.8566],
    "paris, france": [2.3522, 48.8566],
    "tokyo": [139.6503, 35.6762],
    "tokyo, japan": [139.6503, 35.6762],
    "sydney": [151.2093, -33.8688],
    "sydney, australia": [151.2093, -33.8688],
    "los angeles": [-118.2437, 34.0522],
    "los angeles, ca": [-118.2437, 34.0522],
    "los angeles, usa": [-118.2437, 34.0522],
    "berlin": [13.4050, 52.5200],
    "berlin, germany": [13.4050, 52.5200],
    "madrid": [-3.7038, 40.4168],
    "madrid, spain": [-3.7038, 40.4168],
    "rome": [12.4964, 41.9028],
    "rome, italy": [12.4964, 41.9028],
    "amsterdam": [4.9041, 52.3676],
    "amsterdam, netherlands": [4.9041, 52.3676],
    "toronto": [-79.3832, 43.6532],
    "toronto, canada": [-79.3832, 43.6532],
    "vancouver": [-123.1207, 49.2827],
    "vancouver, canada": [-123.1207, 49.2827],
    "mumbai": [72.8777, 19.0760],
    "mumbai, india": [72.8777, 19.0760],
    "delhi": [77.1025, 28.7041],
    "delhi, india": [77.1025, 28.7041],
    "bangkok": [100.5018, 13.7563],
    "bangkok, thailand": [100.5018, 13.7563],
    "singapore": [103.8198, 1.3521],
    "hong kong": [114.1694, 22.3193],
    "seoul": [126.9780, 37.5665],
    "seoul, south korea": [126.9780, 37.5665],
    "melbourne": [144.9631, -37.8136],
    "melbourne, australia": [144.9631, -37.8136],
    "lagos": [3.3792, 6.5244],
    "lagos, nigeria": [3.3792, 6.5244],
    "cairo": [31.2357, 30.0444],
    "cairo, egypt": [31.2357, 30.0444],
    "dubai": [55.2708, 25.2048],
    "dubai, uae": [55.2708, 25.2048],
    "istanbul": [28.9784, 41.0082],
    "istanbul, turkey": [28.9784, 41.0082],
    "moscow": [37.6176, 55.7558],
    "moscow, russia": [37.6176, 55.7558],
    "são paulo": [-46.6333, -23.5505],
    "são paulo, brazil": [-46.6333, -23.5505],
    "mexico city": [-99.1332, 19.4326],
    "mexico city, mexico": [-99.1332, 19.4326],
    "buenos aires": [-58.3816, -34.6037],
    "buenos aires, argentina": [-58.3816, -34.6037]
  };

  // Try exact match first
  if (fallbackCoordinates[cityKey]) {
    return fallbackCoordinates[cityKey];
  }

  // Try partial match for city names
  for (const [key, coords] of Object.entries(fallbackCoordinates)) {
    if (cityKey.includes(key.split(',')[0]) || key.split(',')[0].includes(cityKey)) {
      return coords;
    }
  }

  return [0, 0];
}