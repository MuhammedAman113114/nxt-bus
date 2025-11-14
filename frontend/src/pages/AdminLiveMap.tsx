import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface ActiveBus {
  id: string;
  busId: string;
  busNumber: string;
  driverId: string;
  routeId: string;
  routeName: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  recordedAt: string;
}

export default function AdminLiveMap() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      if (userData.role !== 'admin') {
        navigate('/');
        return;
      }
      
      loadActiveBuses();

      // Connect to Socket.io for real-time updates
      const newSocket = io('http://localhost:3000');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to real-time updates');
      });

      newSocket.on('bus-location-update', (data: any) => {
        console.log('Bus location updated:', data);
        if (autoRefresh) {
          loadActiveBuses();
        }
      });

      // Auto-refresh every 15 seconds
      const interval = setInterval(() => {
        if (autoRefresh) {
          loadActiveBuses();
        }
      }, 15000);

      return () => {
        newSocket.disconnect();
        clearInterval(interval);
      };
    } else {
      navigate('/login');
    }
  }, [navigate, autoRefresh]);

  const loadActiveBuses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gps/buses/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load buses');
      
      const data = await response.json();
      setBuses(data.buses || []);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError('Failed to load active buses');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceUpdate = (recordedAt: string) => {
    const now = new Date();
    const recorded = new Date(recordedAt);
    const diffMs = now.getTime() - recorded.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const getStatusColor = (recordedAt: string) => {
    const now = new Date();
    const recorded = new Date(recordedAt);
    const diffMs = now.getTime() - recorded.getTime();
    const diffMins = diffMs / 60000;
    
    if (diffMins < 1) return '#28a745'; // Green - very recent
    if (diffMins < 3) return '#ffc107'; // Yellow - recent
    return '#dc3545'; // Red - stale
  };

  const getSpeedColor = (speed: number) => {
    if (speed < 10) return '#6c757d'; // Gray - stopped/slow
    if (speed < 40) return '#28a745'; // Green - normal
    if (speed < 60) return '#ffc107'; // Yellow - fast
    return '#dc3545'; // Red - very fast
  };

  const selectedBusData = buses.find(b => b.busId === selectedBus);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '10px'
          }}
        >
          ← Back to Admin Dashboard
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🗺️ Live Bus Tracking</h1>
            <p style={{ margin: 0, color: '#666' }}>
              {buses.length} active {buses.length === 1 ? 'bus' : 'buses'} • Updated {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh</span>
            </label>
            
            <button
              onClick={loadActiveBuses}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
        {/* Map Placeholder */}
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '20px',
          minHeight: '600px'
        }}>
          <h2 style={{ marginTop: 0 }}>Map View</h2>
          
          <div style={{
            background: '#f8f9fa',
            border: '2px dashed #ddd',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            minHeight: '500px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>Map Integration Coming Soon</h3>
            <p style={{ color: '#999', maxWidth: '400px' }}>
              Integrate Google Maps or Mapbox to display bus locations on an interactive map.
              For now, view bus details in the sidebar.
            </p>
            
            {selectedBusData && (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                background: 'white',
                border: '2px solid #007bff',
                borderRadius: '8px',
                textAlign: 'left',
                maxWidth: '400px',
                width: '100%'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '15px' }}>
                  📍 Selected Bus Location
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div><strong>Bus:</strong> {selectedBusData.busNumber}</div>
                  <div><strong>Route:</strong> {selectedBusData.routeName || 'N/A'}</div>
                  <div><strong>Latitude:</strong> {selectedBusData.latitude.toFixed(6)}</div>
                  <div><strong>Longitude:</strong> {selectedBusData.longitude.toFixed(6)}</div>
                  <div><strong>Speed:</strong> {selectedBusData.speed.toFixed(1)} km/h</div>
                  <div><strong>Heading:</strong> {selectedBusData.heading.toFixed(0)}°</div>
                </div>
                
                <a
                  href={`https://www.google.com/maps?q=${selectedBusData.latitude},${selectedBusData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: '15px',
                    padding: '10px',
                    background: '#007bff',
                    color: 'white',
                    textAlign: 'center',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  🗺️ View on Google Maps
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Bus List Sidebar */}
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '20px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <h2 style={{ marginTop: 0 }}>Active Buses ({buses.length})</h2>
          
          {buses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚌</div>
              <p>No active buses</p>
              <p style={{ fontSize: '14px' }}>
                Buses will appear here when drivers start GPS tracking
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {buses.map((bus) => {
                const statusColor = getStatusColor(bus.recordedAt);
                const speedColor = getSpeedColor(bus.speed);
                const isSelected = selectedBus === bus.busId;
                
                return (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBus(bus.busId)}
                    style={{
                      padding: '15px',
                      background: isSelected ? '#e7f3ff' : '#f8f9fa',
                      border: `2px solid ${isSelected ? '#007bff' : statusColor}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8f9fa';
                    }}
                  >
                    {/* Bus Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                        🚌 {bus.busNumber}
                      </div>
                      <div style={{
                        background: statusColor,
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {getTimeSinceUpdate(bus.recordedAt)}
                      </div>
                    </div>

                    {/* Route */}
                    {bus.routeName && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        📍 {bus.routeName}
                      </div>
                    )}

                    {/* Speed */}
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}>
                      <span>🚀</span>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: speedColor
                      }}>
                        {bus.speed.toFixed(1)} km/h
                      </span>
                      <span style={{ color: '#999' }}>•</span>
                      <span style={{ color: '#666' }}>
                        🧭 {bus.heading.toFixed(0)}°
                      </span>
                    </div>

                    {/* Coordinates (small) */}
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#999',
                      marginTop: '8px'
                    }}>
                      {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Legend:</div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#28a745', borderRadius: '50%' }}></div>
            <span>Active (&lt; 1 min)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#ffc107', borderRadius: '50%' }}></div>
            <span>Recent (1-3 min)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#dc3545', borderRadius: '50%' }}></div>
            <span>Stale (&gt; 3 min)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
