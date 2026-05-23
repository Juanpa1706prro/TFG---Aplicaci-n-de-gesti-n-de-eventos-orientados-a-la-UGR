import type maplibregl from 'maplibre-gl';
import { MapMarkerDto } from '@core/interfaces/event-interface';

export function buildMarkersById(markers: MapMarkerDto[]): Map<number, MapMarkerDto> {
  const map = new Map<number, MapMarkerDto>();
  for (const m of markers) {
    map.set(m.id, m);
  }
  return map;
}

export type EventMarkerDisplayStyle = 'dot' | 'card';

export type ScreenClusterConfig = {
  baseRadiusPx: number;
  referenceZoom: number;
  minPoints: number;
  minZoomToCluster: number;
  /** A partir de este zoom los límites anti mega-cluster son más permisivos. */
  clusterLimitsEaseZoom: number;
  maxClusterMembers: number;
  maxClusterMembersFar: number;
  maxClusterScreenSpanPx: number;
  maxClusterScreenSpanPxFar: number;
  maxRadiusPx: number;
  minRadiusPx: number;
};

export const DEFAULT_SCREEN_CLUSTER_CONFIG: ScreenClusterConfig = {
  baseRadiusPx: 92,
  referenceZoom: 17,
  minPoints: 2,
  minZoomToCluster: 15.75,
  clusterLimitsEaseZoom: 17.25,
  maxClusterMembers: 28,
  maxClusterMembersFar: 18,
  maxClusterScreenSpanPx: 300,
  maxClusterScreenSpanPxFar: 220,
  maxRadiusPx: 132,
  minRadiusPx: 48,
};

export function usesDotMarkerDisplay(
  zoom: number,
  config: ScreenClusterConfig = DEFAULT_SCREEN_CLUSTER_CONFIG,
): boolean {
  return zoom < config.minZoomToCluster;
}

export function screenClusterRadiusPx(
  zoom: number,
  config: ScreenClusterConfig = DEFAULT_SCREEN_CLUSTER_CONFIG,
): number {
  if (zoom < config.minZoomToCluster) {
    return 0;
  }
  const delta = config.referenceZoom - zoom;
  if (delta <= 0) {
    return Math.max(
      config.minRadiusPx,
      Math.round(config.baseRadiusPx * Math.pow(2, delta)),
    );
  }
  const grow = Math.pow(1.45, Math.min(delta, 3));
  return Math.min(config.maxRadiusPx, Math.round(config.baseRadiusPx * grow));
}

export type VisibleMapMarker =
  | {
      type: 'cluster';
      clusterId: number;
      longitude: number;
      latitude: number;
      count: number;
      eventIds: number[];
    }
  | {
      type: 'event';
      marker: MapMarkerDto;
      displayStyle: EventMarkerDisplayStyle;
    };

type ProjectedPoint = {
  marker: MapMarkerDto;
  x: number;
  y: number;
};

type ClusterLimits = {
  maxMembers: number;
  maxSpan: number;
};

function projectMarkersInView(
  map: maplibregl.Map,
  markers: MapMarkerDto[],
): ProjectedPoint[] {
  const canvas = map.getCanvas();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const margin = 80;
  const result: ProjectedPoint[] = [];

  for (const marker of markers) {
    const p = map.project([marker.longitude, marker.latitude]);
    if (p.x < -margin || p.x > w + margin || p.y < -margin || p.y > h + margin) {
      continue;
    }
    result.push({ marker, x: p.x, y: p.y });
  }

  return result;
}

function unionFindCluster(
  points: ProjectedPoint[],
  radiusPx: number,
  indices?: number[],
): number[] {
  const active = indices ?? points.map((_, i) => i);
  const n = active.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) {
      root = parent[root];
    }
    let curr = i;
    while (parent[curr] !== curr) {
      const next = parent[curr];
      parent[curr] = root;
      curr = next;
    }
    return root;
  };

  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent[rb] = ra;
    }
  };

  const r2 = radiusPx * radiusPx;
  for (let a = 0; a < n; a++) {
    const i = active[a];
    for (let b = a + 1; b < n; b++) {
      const j = active[b];
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (dx * dx + dy * dy <= r2) {
        union(a, b);
      }
    }
  }

  return parent.map((_, local) => find(local));
}

function groupScreenSpanPx(
  indices: number[],
  points: ProjectedPoint[],
): { width: number; height: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const i of indices) {
    minX = Math.min(minX, points[i].x);
    maxX = Math.max(maxX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxY = Math.max(maxY, points[i].y);
  }
  return { width: maxX - minX, height: maxY - minY };
}

function clusterLimitsForZoom(
  zoom: number,
  config: ScreenClusterConfig,
): ClusterLimits {
  const zStart = config.minZoomToCluster;
  const zFull = config.clusterLimitsEaseZoom;
  const span = Math.max(0.001, zFull - zStart);
  const t = Math.max(0, Math.min(1, (zoom - zStart) / span));
  return {
    maxMembers: Math.round(
      config.maxClusterMembersFar +
        (config.maxClusterMembers - config.maxClusterMembersFar) * t,
    ),
    maxSpan: Math.round(
      config.maxClusterScreenSpanPxFar +
        (config.maxClusterScreenSpanPx - config.maxClusterScreenSpanPxFar) * t,
    ),
  };
}

function groupFitsClusterLimits(
  indices: number[],
  points: ProjectedPoint[],
  limits: ClusterLimits,
  minPoints: number,
): boolean {
  if (indices.length < minPoints) {
    return false;
  }
  if (indices.length > limits.maxMembers) {
    return false;
  }
  const span = groupScreenSpanPx(indices, points);
  return span.width <= limits.maxSpan && span.height <= limits.maxSpan;
}

/** Parte un grupo demasiado grande en subgrupos que puedan clusterizarse. */
function subdivideGroupIndices(
  indices: number[],
  points: ProjectedPoint[],
  limits: ClusterLimits,
): number[][] {
  if (indices.length < 2) {
    return [indices];
  }

  const span = groupScreenSpanPx(indices, points);
  const tightRadius = Math.max(
    52,
    Math.min(limits.maxSpan * 0.42, span.width * 0.38, span.height * 0.38),
  );
  const localRoots = unionFindCluster(points, tightRadius, indices);
  const buckets = new Map<number, number[]>();

  for (let local = 0; local < indices.length; local++) {
    const root = localRoots[local];
    const pointIndex = indices[local];
    const list = buckets.get(root);
    if (list) {
      list.push(pointIndex);
    } else {
      buckets.set(root, [pointIndex]);
    }
  }

  const parts = [...buckets.values()];
  if (parts.length === 1 && parts[0].length === indices.length && indices.length > 2) {
    const sorted = [...indices].sort(
      (a, b) => points[a].x - points[b].x || points[a].y - points[b].y,
    );
    const mid = Math.ceil(sorted.length / 2);
    return [sorted.slice(0, mid), sorted.slice(mid)];
  }

  return parts;
}

function resolveMarkerGroup(
  indices: number[],
  points: ProjectedPoint[],
  limits: ClusterLimits,
  config: ScreenClusterConfig,
  displays: VisibleMapMarker[],
  nextClusterId: { value: number },
  map: maplibregl.Map,
  dotMode: boolean,
): void {
  if (indices.length === 0) {
    return;
  }

  if (indices.length === 1) {
    pushEventDisplay(displays, points[indices[0]].marker, dotMode);
    return;
  }

  if (groupFitsClusterLimits(indices, points, limits, config.minPoints)) {
    let sumX = 0;
    let sumY = 0;
    const eventIds: number[] = [];
    for (const i of indices) {
      sumX += points[i].x;
      sumY += points[i].y;
      eventIds.push(points[i].marker.id);
    }
    const lngLat = map.unproject([sumX / indices.length, sumY / indices.length]);
    displays.push({
      type: 'cluster',
      clusterId: nextClusterId.value,
      longitude: lngLat.lng,
      latitude: lngLat.lat,
      count: eventIds.length,
      eventIds,
    });
    nextClusterId.value += 1;
    return;
  }

  const parts = subdivideGroupIndices(indices, points, limits);
  if (parts.length === 1 && parts[0].length === indices.length) {
    for (const i of indices) {
      pushEventDisplay(displays, points[i].marker, dotMode);
    }
    return;
  }

  for (const part of parts) {
    resolveMarkerGroup(part, points, limits, config, displays, nextClusterId, map, dotMode);
  }
}

function pushEventDisplay(
  displays: VisibleMapMarker[],
  marker: MapMarkerDto,
  dotMode: boolean,
): void {
  displays.push({
    type: 'event',
    marker,
    displayStyle: dotMode ? 'dot' : 'card',
  });
}

/**
 * Lejos: puntos por evento. Cerca: carteleros + clusters al solaparse; grupos grandes se parten.
 */
export type ClusterMarkersViewOptions = {
  /** false = vista lejana con capa GL (sin puntos HTML). */
  htmlDots?: boolean;
};

export function clusterMarkersForMapView(
  map: maplibregl.Map,
  markers: MapMarkerDto[],
  config: ScreenClusterConfig = DEFAULT_SCREEN_CLUSTER_CONFIG,
  clusterIdStart = 1,
  options: ClusterMarkersViewOptions = {},
): { displays: VisibleMapMarker[]; nextClusterId: number } {
  const points = projectMarkersInView(map, markers);
  if (points.length === 0) {
    return { displays: [], nextClusterId: clusterIdStart };
  }

  const zoom = map.getZoom();
  const dotMode = usesDotMarkerDisplay(zoom, config);

  if (dotMode) {
    if (options.htmlDots === false) {
      return { displays: [], nextClusterId: clusterIdStart };
    }
    const displays: VisibleMapMarker[] = points.map((p) => ({
      type: 'event',
      marker: p.marker,
      displayStyle: 'dot' as const,
    }));
    return { displays, nextClusterId: clusterIdStart };
  }

  const radiusPx = screenClusterRadiusPx(zoom, config);
  const limits = clusterLimitsForZoom(zoom, config);
  const roots = unionFindCluster(points, radiusPx);
  const groups = new Map<number, number[]>();

  for (let i = 0; i < points.length; i++) {
    const root = roots[i];
    const list = groups.get(root);
    if (list) {
      list.push(i);
    } else {
      groups.set(root, [i]);
    }
  }

  const displays: VisibleMapMarker[] = [];
  const nextClusterId = { value: clusterIdStart };

  for (const indices of groups.values()) {
    resolveMarkerGroup(
      indices,
      points,
      limits,
      config,
      displays,
      nextClusterId,
      map,
      false,
    );
  }

  return { displays, nextClusterId: nextClusterId.value };
}

/**
 * Huella estable del resultado de clustering (agrupación + estilo dot/card).
 * Ignora posiciones; sirve para evitar recrear DOM si la vista lógica no cambió.
 */
export function visibleMarkersDisplayFingerprint(
  displays: VisibleMapMarker[],
  glDotsActive = false,
): string {
  if (glDotsActive) {
    return 'gl:dots';
  }
  const parts = displays.map((item) => {
    if (item.type === 'cluster') {
      const ids = [...item.eventIds].sort((a, b) => a - b).join(',');
      return `c:${ids}`;
    }
    return `e:${item.marker.id}:${item.displayStyle}`;
  });
  parts.sort();
  return parts.join('|');
}

export function markersFromClusterMembers(
  eventIds: number[],
  markersById: Map<number, MapMarkerDto>,
): MapMarkerDto[] {
  const result: MapMarkerDto[] = [];
  for (const id of eventIds) {
    const m = markersById.get(id);
    if (m) {
      result.push(m);
    }
  }
  return result;
}
