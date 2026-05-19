export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  if (!zip) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`,
      { headers: { 'User-Agent': 'ThePlayaProvides/1.0 (theplayaprovides.com)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
