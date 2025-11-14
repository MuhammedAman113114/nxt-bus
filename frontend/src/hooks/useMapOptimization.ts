import { useState, useEffect, useCallback } from 'react';
import { MapOptimizer } from '../utils/map-optimizer';

export function useMapOptimization() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [shouldCluster, setShouldCluster] = useState(false);
  const [maxMarkers, setMaxMarkers] = useState(100);

  useEffect(() => {
    // Detect connection speed
    const speed = MapOptimizer.detectConnectionSpeed();
    setConnectionSpeed(speed);

    // Adjust settings based on connection
    if (speed === 'slow') {
      setShouldCluster(true);
      setMaxMarkers(50);
    } else if (speed === 'medium') {
      setShouldCluster(false);
      setMaxMarkers(100);
    } else {
      setShouldCluster(false);
      setMaxMarkers(200);
    }

    // Listen for connection changes
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        const handleChange = () => {
          const newSpeed = MapOptimizer.detectConnectionSpeed();
          setConnectionSpeed(newSpeed);
        };
        conn.addEventListener('change', handleChange);
        return () => conn.removeEventListener('change', handleChange);
      }
    }
  }, []);

  const simplifyRoute = useCallback(
    (points: [number, number][]) => {
      const tolerance = connectionSpeed === 'slow' ? 0.001 : 0.0001;
      return MapOptimizer.simplifyPolyline(points, tolerance);
    },
    [connectionSpeed]
  );

  const clusterMarkers = useCallback(
    (markers: any[], zoomLevel: number) => {
      if (!shouldCluster) return markers;
      return MapOptimizer.clusterMarkers(markers, zoomLevel);
    },
    [shouldCluster]
  );

  const filterVisibleMarkers = useCallback(
    (markers: any[], bounds: any) => {
      return MapOptimizer.filterVisibleMarkers(markers, bounds, maxMarkers);
    },
    [maxMarkers]
  );

  return {
    connectionSpeed,
    shouldCluster,
    maxMarkers,
    simplifyRoute,
    clusterMarkers,
    filterVisibleMarkers,
    tileResolution: MapOptimizer.getTileResolution(connectionSpeed)
  };
}
