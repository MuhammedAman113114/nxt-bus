import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';
import websocketService from '../services/websocket.service';

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qrCode: string;
  distanceFromPrevious?: number;
}

interface Route {
  id: string;
  name: string;
  description: string;
  stops: Stop[];
  totalDistance: number;
}

interface BusLocation {
  busId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  timestamp: string;
}

export default function RoutePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<Route | null>(null);
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    loadRouteData();
    setupWebSocket();

    return () => {
      if (id) {
        websocketService.unsubscribeFromRoute(id);
      }
    };
  }, [id]);

  const loadRouteData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Load route details and active buses
      const [routeResponse, busesResponse] = await Promise.all([
        apiService.getRouteById(id),
        apiService.getActiveBusesOnRoute(id)
      ]);

      setRoute(routeResponse.route);
      setBuses(busesResponse.buses || []);
    } catch (err: any) {
      console.error('Error loading route:', err);
      setError(err.response?.data?.error || 'Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    if (!id) return;

    // Subscribe to route updates
    websocketService.subscribeToRoute(id);

    // Listen for bus location updates
    websocketService.on('bus:location', (data: BusLocation) => {
      setBuses(prevBuses => {
        const updatedBuses = prevBuses.filter(bus => bus.busId !== data.busId);
        return [...updatedBuses, data];
      });
    });

    // Listen for bus online/offline events
    websocketService.on('bus:online', (data: any) => {
      if (data.routeId === id) {
        loadRouteData();
      }
    });

    websocketService.on('bus:offline', (data: any) => {
      setBuses(prevBuses => prevBuses.filter(bus => bus.busId !== data.busId));
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛣️</div>
        <p>Loading route...</p>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Failed to Load Route</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>{error || 'Route not found'}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '10px'
          }}
        >
          ← Back to Home
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🛣️ {route.name}</h1>
            <p style={{ margin: 0, color: '#666' }}>{route.description}</p>
          </div>
          
          <div style={{
            background: '#f8f9fa',
            padding: '15px 20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {buses.length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Active Buses</div>
          </div>
        </div>
      </div>

      {/* Route Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: '#e7f3ff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #b3d9ff'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚏</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
            {route.stops.length}
          </div>
          <div style={{ fontSize: '14px', color: '#0066cc' }}>Total Stops</div>
        </div>

        <div style={{
          background: '#e7f9f0',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #b3e6cc'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📏</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00994d' }}>
            {route.totalDistance ? route.totalDistance.toFixed(1) : '0.0'} km
          </div>
          <div style={{ fontSize: '14px', color: '#00994d' }}>Total Distance</div>
        </div>

        <div style={{
          background: '#fff3e0',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #ffcc80'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏱️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
            {route.totalDistance ? Math.round(route.totalDistance / 30 * 60) : 0} min
          </div>
          <div style={{ fontSize: '14px', color: '#e65100' }}>Est. Duration</div>
        </div>
      </div>

      {/* Active Buses Section */}
      {buses.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '15px' }}>🚌 Active Buses</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {buses.map((bus) => (
              <div
                key={bus.busId}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: '#28a745',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    marginRight: '10px'
                  }}>
                    🚌
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      Bus {bus.busId.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#28a745' }}>
                      ● Active
                    </div>
                  </div>
                </div>
                
                {bus.speed !== undefined && (
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                    <strong>Speed:</strong> {Math.round(bus.speed)} km/h
                  </div>
                )}
                
                {bus.heading !== undefined && (
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                    <strong>Heading:</strong> {Math.round(bus.heading)}°
                  </div>
                )}
                
                <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Updated: {new Date(bus.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Stops Section */}
      <div>
        <h2 style={{ marginBottom: '15px' }}>🚏 Route Stops</h2>
        <div style={{ position: 'relative' }}>
          {/* Route line */}
          <div style={{
            position: 'absolute',
            left: '20px',
            top: '30px',
            bottom: '30px',
            width: '3px',
            background: 'linear-gradient(to bottom, #007bff, #28a745)',
            zIndex: 0
          }} />

          {/* Stops list */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {route.stops.map((stop, index) => (
              <div
                key={stop.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '20px',
                  position: 'relative'
                }}
              >
                {/* Stop marker */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: index === 0 ? '#007bff' : index === route.stops.length - 1 ? '#28a745' : 'white',
                  border: `3px solid ${index === 0 ? '#007bff' : index === route.stops.length - 1 ? '#28a745' : '#007bff'}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '15px',
                  flexShrink: 0,
                  zIndex: 2,
                  position: 'relative'
                }}>
                  {index === 0 ? '🏁' : index === route.stops.length - 1 ? '🎯' : '🚏'}
                </div>

                {/* Stop info */}
                <div
                  onClick={() => navigate(`/stops/${stop.id}`)}
                  style={{
                    flex: 1,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
                        {index + 1}. {stop.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                        QR: {stop.qrCode}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        📍 {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                      </div>
                    </div>
                    
                    {index === 0 && (
                      <span style={{
                        background: '#007bff',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        START
                      </span>
                    )}
                    
                    {index === route.stops.length - 1 && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        END
                      </span>
                    )}
                  </div>

                  {/* Distance from previous stop */}
                  {index > 0 && stop.distanceFromPrevious !== undefined && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      📏 {stop.distanceFromPrevious.toFixed(2)} km from previous stop
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info box */}
      <div style={{
        marginTop: '30px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0066cc' }}>
          💡 Route Information
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0066cc' }}>
          <li>Click on any stop to view detailed information and upcoming buses</li>
          <li>🏁 <strong>Blue marker</strong> indicates the starting point</li>
          <li>🎯 <strong>Green marker</strong> indicates the final destination</li>
          <li>Active buses are updated in real-time</li>
          <li>Estimated duration assumes average speed of 30 km/h</li>
        </ul>
      </div>
    </div>
  );
}
