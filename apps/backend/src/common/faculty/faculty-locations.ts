import {
  UserFaculty,
  USER_FACULTY_LABELS,
} from '../../modules/user/user-enums';

// -------------------------------------------------------------------
// UGR faculty map presets (same coords as frontend create-event).
// Used by the AI assistant tools to geolocate events on the server.
// -------------------------------------------------------------------

/** WGS84 coordinates for each faculty / school (MapLibre marker preset). */
export const FACULTY_COORDINATES: Record<
  UserFaculty,
  { lat: number; lng: number }
> = {
  [UserFaculty.ETSIIT]: { lat: 37.197055, lng: -3.624551 },
  [UserFaculty.FBA]: { lat: 37.195508, lng: -3.626699 },
  [UserFaculty.ETSIE]: { lat: 37.181268, lng: -3.606903 },
  [UserFaculty.ETSCCP]: { lat: 37.181375, lng: -3.607995 },
  [UserFaculty.FCC]: { lat: 37.179753, lng: -3.609299 },
  [UserFaculty.ETSA]: { lat: 37.172905, lng: -3.591277 },
  [UserFaculty.FDE]: { lat: 37.178144, lng: -3.601973 },
  [UserFaculty.FCPY]: { lat: 37.180637, lng: -3.604488 },
  [UserFaculty.FTS]: { lat: 37.180637, lng: -3.604488 },
  [UserFaculty.FCCD]: { lat: 37.205095, lng: -3.597842 },
  [UserFaculty.FCE]: { lat: 37.193088, lng: -3.599759 },
  [UserFaculty.FCEE]: { lat: 37.19242, lng: -3.594726 },
  [UserFaculty.FCD]: { lat: 37.193306, lng: -3.596524 },
  [UserFaculty.FFA]: { lat: 37.194966, lng: -3.596525 },
  [UserFaculty.FFL]: { lat: 37.191632, lng: -3.595611 },
  [UserFaculty.FOD]: { lat: 37.193124, lng: -3.596493 },
  [UserFaculty.FPS]: { lat: 37.194464, lng: -3.594351 },
  [UserFaculty.FCS]: { lat: 37.149005, lng: -3.60591 },
  [UserFaculty.FME]: { lat: 37.148469, lng: -3.605174 },
  [UserFaculty.FCEETC]: { lat: 35.890847, lng: -5.298843 },
  [UserFaculty.FCSC]: { lat: 35.890992, lng: -5.298245 },
  [UserFaculty.FCEDM]: { lat: 35.28974, lng: -2.953085 },
  [UserFaculty.FCSM]: { lat: 35.289698, lng: -2.952299 },
  [UserFaculty.FCSJM]: { lat: 35.289671, lng: -2.952915 },
};

export type FacultyLocation = {
  facultyCode: UserFaculty;
  /** Same text as the create-event faculty preset (full official label). */
  location: string;
  latitude: number;
  longitude: number;
};

const USER_FACULTY_CODES = Object.values(UserFaculty) as UserFaculty[];

function normalizeFacultyQuery(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a {@link FacultyLocation} for a known faculty code.
 * @param {UserFaculty} code - Faculty enum value.
 * @returns {FacultyLocation} Label and coordinates for map placement.
 */
export function getFacultyLocationByCode(code: UserFaculty): FacultyLocation {
  const coords = FACULTY_COORDINATES[code];
  return {
    facultyCode: code,
    location: USER_FACULTY_LABELS[code],
    latitude: coords.lat,
    longitude: coords.lng,
  };
}

/**
 * Resolves a free-text query (code or part of the official name) to map coords.
 * Examples: "ETSIIT", "etsiit", "ingeniería informática", "Facultad de Derecho".
 * @param {string} query - User or model text mentioning a UGR center.
 * @returns {FacultyLocation | null} Match, or null if ambiguous / unknown.
 */
export function resolveFacultyLocation(query: string): FacultyLocation | null {
  const normalized = normalizeFacultyQuery(query);
  if (!normalized) {
    return null;
  }

  const tokens = normalized.split(' ').filter(Boolean);

  for (const code of USER_FACULTY_CODES) {
    if (normalized === code || tokens.includes(code)) {
      return getFacultyLocationByCode(code);
    }
  }

  const compactQuery = normalized.replace(/\s/g, '');

  for (const code of USER_FACULTY_CODES) {
    if (compactQuery.includes(code)) {
      return getFacultyLocationByCode(code);
    }
  }

  const matches: UserFaculty[] = [];

  for (const code of USER_FACULTY_CODES) {
    const labelNorm = normalizeFacultyQuery(USER_FACULTY_LABELS[code]);
    if (labelNorm.includes(normalized) || normalized.includes(labelNorm)) {
      matches.push(code);
      continue;
    }
    const significant = tokens.filter((t) => t.length >= 4);
    if (
      significant.length > 0 &&
      significant.every((token) => labelNorm.includes(token))
    ) {
      matches.push(code);
    }
  }

  const unique = [...new Set(matches)];
  if (unique.length === 1) {
    return getFacultyLocationByCode(unique[0]!);
  }

  return null;
}

/**
 * Short catalog for system prompts or tool listing (code + label).
 * @returns {Array<{ code: UserFaculty; label: string }>}
 */
export function listFacultyLocationSummaries(): Array<{
  code: UserFaculty;
  label: string;
}> {
  return USER_FACULTY_CODES.map((code) => ({
    code,
    label: USER_FACULTY_LABELS[code],
  }));
}
