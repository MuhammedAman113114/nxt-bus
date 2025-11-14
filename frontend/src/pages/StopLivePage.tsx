import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qrCode?: string;
}

interface Route {
  id: string;
  name: string;
  busId: string;
  busNumber: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  reachingTime: string;
  stops: any[];
}

export default function StopLivePage() {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<Stop | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stopId) {
      loadStopData();
    }
  }, [stopId]);

  const loadStopData = async () => {
    try {
      setLoading(true);
      
      // Load stop details
      const stopRes = await fetch(`/api/stops/${stopId}`);
      const stopData = await stopRes.json();
      
      if (!stopData.stop) {
        setError('Stop not found');
        return;
      }
      
      setStop(stopData.stop);
      
      // Load routes serving this stop
      const routesRes = await fetch('/api/routes');
      const routesData = await routesRes.json();
      
      // Filter routes that include this stop
      const filteredRoutes = (routesData.routes || []).filter((route: Route) =>
        route.stops && route.stops.some((s: any) => s.id === stopId)
      );
      
      setRoutes(filteredRoutes);
    } catch (err) {
      setError('Failed to load stop data');
    } finally {
      setLoading(false);
    }
  };

  const getStopPosition = (route: Route) => {
    const stopIndex = route.stops.findIndex(s => s.id === stopId);
    if (stopIndex === -1) return null;
    
    return {
      current: stopIndex + 1,
      total: route.stops.length,
      isFirst: stopIndex === 0,
      isLast: stopIndex === route.stops.length - 1
    };
  };

  const shareStop = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Bus Stop: ${stop?.name}`,
        text: `Check buses arriving at ${stop?.name}`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '20px' }}>Loading...</div>
      </div>
    );
  }

  if (error || !stop) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ margin: 0, marginBottom: '10px' }}>{error || 'Stop not found'}</h2>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 16px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ← Back
            </button>
            <h1 style={{ margin: 0, color: '#667eea', fontSize: '28px' }}>🚌 NXT Bus</h1>
          </div>
          <button
            onClick={shareStop}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📤 Share
          </button>
        </div>
      </div>

      {/* Stop Info */}
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📍</div>
            <h2 style={{ margin: 0, marginBottom: '10px', fontSize: '32px', color: '#333' }}>
              {stop.name}
            </h2>
            <div style={{ color: '#666', fontSize: '14px' }}>
              Stop ID: {stop.id}
            </div>
            {stop.qrCode && (
              <div style={{
                marginTop: '15px',
                padding: '8px 16px',
                background: '#e7f3ff',
                color: '#0066cc',
                borderRadius: '20px',
                display: 'inline-block',
                fontSize: '13px'
              }}>
                QR Code: {stop.qrCode}
              </div>
            )}
          </div>
        </div>

        {/* Routes */}
        <div>
          <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '24px' }}>
            {routes.length > 0 ? `${routes.length} Bus${routes.length !== 1 ? 'es' : ''} Serving This Stop` : 'No Buses Available'}
          </h3>

          {routes.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚌</div>
              <h3 style={{ margin: 0, marginBottom: '10px', color: '#333' }}>No Buses Yet</h3>
              <p style={{ margin: 0, color: '#666' }}>
                No routes are currently serving this stop
              </p>
            </div>
          ) : (
            routes.map(route => {
              const position = getStopPosition(route);
              
              return (
                <div
                  key={route.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '25px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => navigate(`/?from=${encodeURIComponent(stop.name)}&to=${encodeURIComponent(route.toLocation)}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* Route Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                        🚍 {route.name}
                      </h4>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                        Bus: {route.busNumber}
                      </div>
                    </div>
                    {position && (
                      <div style={{
                        background: position.isFirst ? '#28a745' : position.isLast ? '#dc3545' : '#667eea',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}>
                        {position.isFirst ? 'Starting Point' : position.isLast ? 'Last Stop' : `Stop ${position.current}/${position.total}`}
                      </div>
                    )}
                  </div>

                  {/* Route Details */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>From</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                        {route.fromLocation}
                      </div>
                      <div style={{ fontSize: '14px', color: '#667eea', marginTop: '3px' }}>
                        {route.departureTime}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '24px' }}>→</div>
                    
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>To</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                        {route.toLocation}
                      </div>
                      <div style={{ fontSize: '14px', color: '#667eea', marginTop: '3px' }}>
                        {route.reachingTime}
                      </div>
                    </div>
                  </div>

                  {/* Click to search */}
                  <div style={{
                    marginTop: '15px',
                    textAlign: 'center',
                    color: '#667eea',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    Click to search from this stop →
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* QR Code Info */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            💡 <strong>Tip:</strong> Share this page or scan the QR code at this stop to see live bus arrivals
          </div>
          <div style={{ fontSize: '13px', color: '#999' }}>
            URL: {window.location.href}
          </div>
        </div>
      </div>
    </div>
  );
}
