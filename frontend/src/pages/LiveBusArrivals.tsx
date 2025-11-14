import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface BusArrival {
  id: string;
  busId: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  predictedArrival: string;
  estimatedMinutes: number;
  distanceKm: number;
  confidenceScore: number;
  calculationMethod: string;
  calculatedAt: string;
}

export default function LiveBusArrivals() {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (stopId) {
      loadStopData();
      loadArrivals();

      // Connect to Socket.io for real-time updates
      const newSocket = io('http://localhost:3000');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to real-time updates');
      });

      newSocket.on('bus-location-update', (data: any) => {
        console.log('Bus location updated:', data);
        // Reload arrivals when any bus updates
        loadArrivals();
      });

      newSocket.on('bus-arrival', (data: any) => {
        console.log('Bus arrived:', data);
        if (data.stopId === stopId) {
          loadArrivals();
        }
      });

      // Refresh arrivals every 30 seconds
      const interval = setInterval(() => {
        loadArrivals();
      }, 30000);

      return () => {
        newSocket.disconnect();
        clearInterval(interval);
      };
    }
  }, [stopId]);

  const loadStopData = async () => {
    try {
      const response = await fetch(`/api/stops/${stopId}`);
      if (!response.ok) throw new Error('Stop not found');
      
      const data = await response.json();
      setStop(data.stop);
    } catch (err) {
      setError('Failed to load stop information');
    }
  };

  const loadArrivals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gps/eta/stop/${stopId}`);
      if (!response.ok) throw new Error('Failed to load arrivals');
      
      const data = await response.json();
      setArrivals(data.arrivals || []);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError('Failed to load bus arrivals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (minutes: number, confidenceScore: number) => {
    if (minutes <= 5) return '#28a745'; // Green - arriving soon
    if (minutes <= 15) return '#ffc107'; // Yellow - moderate wait
    return '#6c757d'; // Gray - long wait
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const target = new Date(isoString);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Arriving now';
    if (diffMins === 1) return '1 minute';
    return `${diffMins} minutes`;
  };

  if (loading && !stop) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚏</div>
        <p>Loading stop information...</p>
      </div>
    );
  }

  if (error && !stop) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <p style={{ color: '#dc3545' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
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
        <h1 style={{ margin: 0, marginBottom: '5px' }}>
          🚏 {stop?.name || 'Bus Stop'}
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Live bus arrivals • Updated {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Refresh Button */}
      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <button
          onClick={loadArrivals}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Arrivals List */}
      {arrivals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚌</div>
          <h3 style={{ color: '#666', marginBottom: '10px' }}>No Buses Currently Tracked</h3>
          <p style={{ color: '#999' }}>
            Buses will appear here when drivers start GPS tracking
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {arrivals.map((arrival) => {
            const statusColor = getStatusColor(arrival.estimatedMinutes, arrival.confidenceScore);
            const confidenceLabel = getConfidenceLabel(arrival.confidenceScore);
            
            return (
              <div
                key={arrival.id}
                style={{
                  background: 'white',
                  border: `2px solid ${statusColor}`,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {/* Bus Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'start',
                  marginBottom: '15px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}>
                      🚌 {arrival.busNumber}
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      color: '#666'
                    }}>
                      {arrival.routeName}
                    </div>
                  </div>
                  
                  <div style={{
                    background: statusColor,
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    minWidth: '100px'
                  }}>
                    {arrival.estimatedMinutes} min
                  </div>
                </div>

                {/* Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Arriving At
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {formatTime(arrival.predictedArrival)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Distance
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {arrival.distanceKm.toFixed(1)} km
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Confidence
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {confidenceLabel} ({(arrival.confidenceScore * 100).toFixed(0)}%)
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Status
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {getRelativeTime(arrival.predictedArrival)}
                    </div>
                  </div>
                </div>

                {/* Method Badge */}
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                  {arrival.calculationMethod === 'gps_based' && '📡 GPS Tracking'}
                  {arrival.calculationMethod === 'hybrid' && '🔄 GPS + Historical Data'}
                  {arrival.calculationMethod === 'historical' && '📊 Historical Data'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#e7f3ff',
        border: '1px solid #007bff',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>ℹ️ How it works:</div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Real-time GPS tracking from bus drivers</li>
          <li>Automatic updates every 30 seconds</li>
          <li>Arrival times calculated based on current location and speed</li>
          <li>Confidence score shows prediction accuracy</li>
        </ul>
      </div>
    </div>
  );
}
