/**
 * Map Rendering Optimizer
 * Reduces map complexity for better performance on slow connections
 */

export class MapOptimizer {
  /**
   * Simplify polyline coordinates using Douglas-Peucker algorithm
   */
  static simplifyPolyline(
    points: [number, number][],
    tolerance: number = 0.0001
  ): [number, number][] {
    if (points.length <= 2) return points;

    // Find point with maximum distance from line segment
    let maxDistance = 0;
    let maxIndex = 0;

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(
        points[i],
        firstPoint,
        lastPoint
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSegment = this.simplifyPolyline(
        points.slice(0, maxIndex + 1),
        tolerance
      );
      const rightSegment = this.simplifyPolyline(
        points.slice(maxIndex),
        tolerance
      );

      return leftSegment.slice(0, -1).concat(rightSegment);
    } else {
      return [firstPoint, lastPoint];
    }
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private static perpendicularDistance(
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ): number {
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Cluster nearby markers to reduce rendering load
   */
  static clusterMarkers(
    markers: Array<{ lat: number; lng: number; data: any }>,
    zoomLevel: number,
    gridSize: number = 60
  ): Array<{
    lat: number;
    lng: number;
    count: number;
    markers: any[];
  }> {
    // Don't cluster at high zoom levels
    if (zoomLevel >= 15) {
      return markers.map(m => ({
        lat: m.lat,
        lng: m.lng,
        count: 1,
        markers: [m.data]
      }));
    }

    const clusters: Map<string, any> = new Map();
    const pixelSize = 256 * Math.pow(2, zoomLevel);
    const gridSizeInDegrees = (gridSize / pixelSize) * 360;

    markers.forEach(marker => {
      const gridX = Math.floor(marker.lng / gridSizeInDegrees);
      const gridY = Math.floor(marker.lat / gridSizeInDegrees);
      const key = `${gridX},${gridY}`;

      if (clusters.has(key)) {
        const cluster = clusters.get(key);
        cluster.count++;
        cluster.markers.push(marker.data);
        // Update center to average position
        cluster.lat = (cluster.lat * (cluster.count - 1) + marker.lat) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + marker.lng) / cluster.count;
      } else {
        clusters.set(key, {
          lat: marker.lat,
          lng: marker.lng,
          count: 1,
          markers: [marker.data]
        });
      }
    });

    return Array.from(clusters.values());
  }

  /**
   * Limit number of visible markers based on viewport
   */
  static filterVisibleMarkers(
    markers: Array<{ lat: number; lng: number; data: any }>,
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    maxMarkers: number = 100
  ): any[] {
    // Filter markers within bounds
    const visible = markers.filter(
      m =>
        m.lat >= bounds.south &&
        m.lat <= bounds.north &&
        m.lng >= bounds.west &&
        m.lng <= bounds.east
    );

    // If too many markers, prioritize by importance or distance
    if (visible.length > maxMarkers) {
      return visible.slice(0, maxMarkers);
    }

    return visible.map(m => m.data);
  }

  /**
   * Get appropriate tile resolution based on connection speed
   */
  static getTileResolution(connectionSpeed: 'slow' | 'medium' | 'fast'): string {
    switch (connectionSpeed) {
      case 'slow':
        return '@1x'; // Lower resolution tiles
      case 'medium':
        return '@1x';
      case 'fast':
        return '@2x'; // High resolution tiles
      default:
        return '@1x';
    }
  }

  /**
   * Detect connection speed
   */
  static detectConnectionSpeed(): 'slow' | 'medium' | 'fast' {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        const effectiveType = conn.effectiveType;
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          return 'slow';
        } else if (effectiveType === '3g') {
          return 'medium';
        } else {
          return 'fast';
        }
      }
    }
    return 'medium'; // Default
  }

  /**
   * Debounce map updates
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        func(...args);
      };

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle map updates
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Calculate optimal zoom level for given bounds
   */
  static calculateOptimalZoom(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    mapWidth: number,
    mapHeight: number
  ): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 18;

    function latRad(lat: number) {
      const sin = Math.sin((lat * Math.PI) / 180);
      const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
      return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx: number, worldPx: number, fraction: number) {
      return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const latFraction = (latRad(bounds.north) - latRad(bounds.south)) / Math.PI;
    const lngDiff = bounds.east - bounds.west;
    const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;

    const latZoom = zoom(mapHeight, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(mapWidth, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
  }

  /**
   * Cache tile URLs to reduce requests
   */
  private static tileCache: Map<string, string> = new Map();

  static getCachedTileUrl(url: string): string {
    if (this.tileCache.has(url)) {
      return this.tileCache.get(url)!;
    }
    this.tileCache.set(url, url);
    return url;
  }

  /**
   * Clear tile cache
   */
  static clearTileCache(): void {
    this.tileCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.tileCache.size,
      maxSize: 1000 // Arbitrary limit
    };
  }
}
