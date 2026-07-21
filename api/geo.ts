/* Vercel serverless function (root api/ directory — deployed alongside the
   static Astro build, no adapter needed). Echoes the geolocation headers
   Vercel attaches to every request so the sky script can place the visitor
   without a third-party IP lookup. Not served by `astro dev`; locally the
   sky falls back to San Francisco ("borrowed sky"). */
export function GET(request: Request): Response {
  const latitude = Number.parseFloat(request.headers.get('x-vercel-ip-latitude') ?? '');
  const longitude = Number.parseFloat(request.headers.get('x-vercel-ip-longitude') ?? '');
  const rawCity = request.headers.get('x-vercel-ip-city');

  const located = Number.isFinite(latitude) && Number.isFinite(longitude);
  /* Vercel URL-encodes the city header (e.g. "S%C3%A3o%20Paulo"). */
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  return Response.json(located ? { latitude, longitude, city } : { latitude: null, longitude: null, city: null }, {
    headers: { 'cache-control': 'private, no-store' },
  });
}
