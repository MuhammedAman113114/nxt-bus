import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';
import websocketService from '../services/websocket.service';

interface BusStop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qrCode: string;
}

interface Route {
  id: string;
  name: string;
  description: string;
  activeBuses: number;
}

interface ETA {
  busId: string;
  stopId: string;
  estimatedArrival: string;
  distance: number;
  confidence: 'high' | 'medium' | 'low';
}

export default function BusStopPage() {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<BusStop | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [etas, setEtas] = useState<ETA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!stopId) return;

    loadStopData();
    setupWebSocket();

    // Refresh ETAs every 30 seconds
    const interval = setInterval(() => {
      refreshETAs();
    }, 30000);

    return () => {
      clearInterval(interval);
      websocketService.unsubscribeFromStop(stopId);
    };
  }, [stopId]);

  const loadStopData = async () => {
    try {
      setLoading(true);
      
      // Progressive loading: Load critical data first (stop info and ETAs)
      // Then load routes in background
      const response = await apiService.getStopById(stopId!);
      
      // Critical: Stop info and ETAs (show immediately)
      setStop(response.stop);
      setEtas(response.etas || []);
      setLastUpdate(new Date());
      setLoading(false); // Show content now
      
      // Important: Routes (load in background)
      setTimeout(() => {
        setRoutes(response.routes || []);
      }, 0);
      
    } catch (err: any) {
      console.error('Error loading stop:', err);
      setError(err.response?.data?.error || 'Failed to load bus stop');
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Subscribe to stop updates
    websocketService.subscribeToStop(stopId!);

    // Listen for ETA updates
    websocketService.on('stop:etas', (data: any) => {
      if (data.stopId === stopId) {
        setEtas(data.etas);
        setLastUpdate(new Date());
      }
    });

    // Listen for bus arrivals
    websocketService.on('bus:arrival', (data: any) => {
      console.log('Bus arriving:', data);
      // Could show a notification here
    });
  };

  const refreshETAs = async () => {
    try {
      const response = await apiService.getStopById(stopId!);
      setEtas(response.etas || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error refreshing ETAs:', err);
    }
  };

  const formatETA = (eta: ETA): string => {
    const now = new Date();
    const arrival = new Date(eta.estimatedArrival);
    const diffMs = arrival.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 1) return 'Arriving now';
    if (diffMins === 1) return '1 minute';
    if (diffMins < 60) return `${diffMins} minutes`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence) {
      case 'high': return '#28a745';
      case 'medium': return '#ffc107';
      case 'low': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const handleSubscribe = async (routeId: string) => {
    try {
      await apiService.subscribe(routeId, stopId!, 10);
      alert('Subscribed! You will receive notifications when buses approach this stop.');
    } catch (err) {
      console.error('Error subscribing:', err);
      alert('Failed to subscribe. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚏</div>
        <p>Loading bus stop...</p>
      </div>
    );
  }

  if (error || !stop) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Bus Stop Not Found</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
          <div style={{ fontSize: '48px' }}>🚏</div>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>{stop.name}</h1>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              QR Code: {stop.qrCode}
            </p>
          </div>
        </div>

        <div style={{ 
          fontSize: '12px', 
          color: '#666',
          marginTop: '10px'
        }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Routes serving this stop */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Routes</h2>
        {routes.length === 0 ? (
          <p style={{ color: '#666' }}>No routes serve this stop</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {routes.map((route) => (
              <div
                key={route.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, marginBottom: '5px', fontSize: '16px' }}>
                    {route.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {route.description}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                    <span style={{ 
                      color: route.activeBuses > 0 ? '#28a745' : '#dc3545' 
                    }}>
                      ● {route.activeBuses} active {route.activeBuses === 1 ? 'bus' : 'buses'}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleSubscribe(route.id)}
                  style={{
                    padding: '8px 16px',
                    background: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  🔔 Subscribe
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming buses */}
      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Upcoming Buses</h2>
        {etas.length === 0 ? (
          <div style={{
            background: '#f8f9fa',
            padding: '30px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚌</div>
            <p style={{ color: '#666', margin: 0 }}>
              No buses approaching this stop right now
            </p>
            <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
              Check back later or subscribe to get notified
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {etas.map((eta, index) => (
              <div
                key={`${eta.busId}-${index}`}
                style={{
                  border: '2px solid #007bff',
                  borderRadius: '8px',
                  padding: '20px',
                  background: index === 0 ? '#e7f3ff' : 'white'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold',
                      color: '#007bff'
                    }}>
                      {formatETA(eta)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                      {eta.distance.toFixed(2)} km away
                    </div>
                  </div>
                  <div style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    background: getConfidenceColor(eta.confidence),
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {eta.confidence.toUpperCase()}
                  </div>
                </div>
                
                {index === 0 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    background: '#fff3cd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    color: '#856404'
                  }}>
                    ⚡ Next bus arriving soon!
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={refreshETAs}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => navigate('/scan')}
            style={{
              padding: '10px 20px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📱 Scan Another Stop
          </button>
        </div>
      </div>
    </div>
  );
}
