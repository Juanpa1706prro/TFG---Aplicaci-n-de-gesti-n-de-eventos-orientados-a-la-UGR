import type { GeoJsonLineStringFeature } from '../interfaces/route-directions-response.interface';

// -------------------------------------------------------------------
// Google encoded polyline decoder
// Encoded Polyline Algorithm Format → GeoJSON LineString [lng, lat].
// @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
// -------------------------------------------------------------------

/**
 * Decodes an encoded polyline string into WGS84 coordinates for GeoJSON.
 * @param {string} encoded - Encoded polyline from Routes API.
 * @returns {[number, number][]} Coordinate pairs [longitude, latitude].
 */
export function decodeEncodedPolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

/**
 * Builds a GeoJSON LineString feature from an encoded route polyline.
 * @param {string} encoded - Encoded polyline from Routes API.
 * @returns {GeoJsonLineStringFeature} Feature ready for MapLibre GeoJSON source.
 */
export function encodedPolylineToGeoJsonLine(
  encoded: string,
): GeoJsonLineStringFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: decodeEncodedPolyline(encoded),
    },
  };
}
