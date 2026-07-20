/**
 * Nautical & Imperial / Metric Units Formatter for Logbook Frontend.
 * Enforces user formatting rules:
 * - Vessel Speed: kn & (km/h) -> "6.8 kn (12.6 km/h)"
 * - Distance: NM & (km) -> "12.5 NM (23.2 km)"
 * - Depth & Draft: ft & (m) -> "19.7 ft (6.0 m)"
 * - Vessel Dimensions (Length, Beam): ft & (m) -> "42.0 ft (12.8 m)"
 * - Wind Speed: kn & (m/s, Beaufort) -> "12.0 kn (6.2 m/s, 4 Bft)"
 * - Temperature: °F & (°C) -> "72.5 °F (22.5 °C)"
 * - Air Pressure: inHg & (hPa) -> "29.91 inHg (1013 hPa)"
 */

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9.0) / 5.0 + 32.0;
}

export function formatTemperature(celsius: number): string {
  const fahrenheit = celsiusToFahrenheit(celsius);
  return `${fahrenheit.toFixed(1)} °F (${celsius.toFixed(1)} °C)`;
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function formatLengthOrDepth(meters: number): string {
  const feet = metersToFeet(meters);
  return `${feet.toFixed(1)} ft (${meters.toFixed(1)} m)`;
}

export function formatDepth(meters: number): string {
  return formatLengthOrDepth(meters);
}

export function knotsToKmh(knots: number): number {
  return knots * 1.852;
}

export function formatVesselSpeed(knots: number): string {
  const kmh = knotsToKmh(knots);
  return `${knots.toFixed(1)} kn (${kmh.toFixed(1)} km/h)`;
}

export function nmToKm(nm: number): number {
  return nm * 1.852;
}

export function formatDistance(nm: number): string {
  const km = nmToKm(nm);
  return `${nm.toFixed(1)} NM (${km.toFixed(1)} km)`;
}

export function hpaToInhg(hpa: number): number {
  return hpa * 0.02953;
}

export function formatPressure(hpa: number): string {
  const inhg = hpaToInhg(hpa);
  return `${inhg.toFixed(2)} inHg (${hpa.toFixed(0)} hPa)`;
}

export function knotsToMs(knots: number): number {
  return knots * 0.514444;
}

export function msToBeaufort(ms: number): number {
  if (ms < 0.5) return 0;
  if (ms < 1.6) return 1;
  if (ms < 3.4) return 2;
  if (ms < 5.5) return 3;
  if (ms < 8.0) return 4;
  if (ms < 10.8) return 5;
  if (ms < 13.9) return 6;
  if (ms < 17.2) return 7;
  if (ms < 20.8) return 8;
  if (ms < 24.5) return 9;
  if (ms < 28.5) return 10;
  if (ms < 32.7) return 11;
  return 12;
}

export function formatWindSpeed(knots: number): string {
  const ms = knotsToMs(knots);
  const bft = msToBeaufort(ms);
  return `${knots.toFixed(1)} kn (${ms.toFixed(1)} m/s, ${bft} Bft)`;
}
