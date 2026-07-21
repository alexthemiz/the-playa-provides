// Returns keys matching the locations table's latitude/longitude columns
// directly, since every caller spreads this straight into a Supabase
// insert/update on `locations` — a lat/lng-named shape silently fails there
// with a "Could not find the 'lat' column" schema-cache error.
export async function geocodeZip(zip: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!zip) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`,
      { headers: { 'User-Agent': 'ThePlayaProvides/1.0 (theplayaprovides.com)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
