import { lazy, Suspense } from 'react';

// Lazy load the map component (Leaflet is heavy)
const MapComponent = lazy(() => import('./MapComponent'));

interface LazyMapProps {
  buses?: any[];
  stops?: any[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onStopClick?: (stop: any) => void;
  onBusClick?: (bus: any) => void;
  showUserLocation?: boolean;
}

export default function LazyMap(props: LazyMapProps) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: props.height || '400px',
            width: '100%',
            background: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ddd'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🗺️</div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>
            Loading map...
          </div>
          <div style={{
            width: '200px',
            height: '4px',
            background: '#e0e0e0',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                width: '50%',
                height: '100%',
                background: '#007bff',
                animation: 'loading 1.5s ease-in-out infinite'
              }}
            />
          </div>
          <style>{`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      }
    >
      <MapComponent {...props} />
    </Suspense>
  );
}
