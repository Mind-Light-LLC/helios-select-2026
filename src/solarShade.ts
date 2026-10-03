const radians = Math.PI / 180;
const tileSize = 256;

export function solarPosition(now: Date): { longitude: number; declination: number } {
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1);
  const day = Math.floor((now.getTime() - yearStart) / 86400000) + 1;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  const gamma = 2 * Math.PI / 365 * (day - 1 + (minutes / 60 - 12) / 24);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const longitude = ((180 - (minutes + equation) / 4 + 540) % 360) - 180;
  return { longitude, declination };
}

function opacityFromCosine(cosine: number): number {
  const twilight = Math.max(0, Math.min(1, (0.18 - cosine) / 0.36));
  return twilight * twilight * (3 - 2 * twilight);
}

export function shadeOpacity(latitude: number, longitude: number, now: Date): number {
  const sun = solarPosition(now);
  const lat = latitude * radians;
  const cosine = Math.sin(lat) * Math.sin(sun.declination)
    + Math.cos(lat) * Math.cos(sun.declination) * Math.cos((longitude - sun.longitude) * radians);
  return opacityFromCosine(cosine);
}

function latitudeAt(y: number, scale: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) / radians;
}

export async function shadeTile(url: string): Promise<ImageBitmap> {
  const parsed = new URL(url);
  const zoom = Number(parsed.hostname);
  const [tileX, tileY] = parsed.pathname.slice(1).split('/').map(Number);
  const slot = Number(parsed.searchParams.get('slot'));
  if (![zoom, tileX, tileY, slot].every(Number.isFinite) || zoom < 0 || zoom > 8) {
    throw new Error('Invalid solar tile request.');
  }
  const now = new Date(slot * 300000);
  const sun = solarPosition(now);
  const sinDeclination = Math.sin(sun.declination);
  const cosDeclination = Math.cos(sun.declination);
  const canvas = new OffscreenCanvas(tileSize, tileSize);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Solar shading is unavailable.');
  const image = context.createImageData(tileSize, tileSize);
  const worldPixels = tileSize * 2 ** zoom;
  for (let y = 0; y < tileSize; y++) {
    const latitude = latitudeAt(tileY * tileSize + y + 0.5, worldPixels);
    const sinLatitude = Math.sin(latitude * radians);
    const cosLatitude = Math.cos(latitude * radians);
    for (let x = 0; x < tileSize; x++) {
      const longitude = (tileX * tileSize + x + 0.5) / worldPixels * 360 - 180;
      const cosine = sinLatitude * sinDeclination + cosLatitude * cosDeclination
        * Math.cos((longitude - sun.longitude) * radians);
      const index = (y * tileSize + x) * 4;
      image.data[index] = 10;
      image.data[index + 1] = 31;
      image.data[index + 2] = 58;
      image.data[index + 3] = Math.round(opacityFromCosine(cosine) * 48);
    }
  }
  context.putImageData(image, 0, 0);
  return createImageBitmap(canvas);
}

export function shadeTileTemplate(now: Date): string {
  return `helios-shade://{z}/{x}/{y}?slot=${Math.floor(now.getTime() / 300000)}`;
}
