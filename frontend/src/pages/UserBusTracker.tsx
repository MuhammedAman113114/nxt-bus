import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function UserBusTracker() {
  const navigate = useNavigate();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    loadStops();
  }, []);

  useEffect(() => {
    if (selectedStop) {
      loadArrivals(selectedStop.id);

      // Connect to Socket.io for real-time updates
      const newSocket = io('http://localhost:3000');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to real-time updates');
      });

      newSocket.on('bus-location-update', (data: any) => {
        console.log('Bus location updated:', data);
        loadArrivals(selectedStop.id);
      });

      newSocket.on('bus-arrival', (data: any) => {
        console.log('Bus arrived:', data);
        if (data.stopId === selectedStop.id) {
          loadArrivals(selectedStop.id);
        }
      });

      // Refresh arrivals every 30 seconds
      const interval = setInterval(() => {
        loadArrivals(selectedStop.id);
      }, 30000);

      return () => {
        newSocket.disconnect();
        clearInterval(interval);
      };
    }
  }, [selectedStop]);

  const loadStops = async () => {
    try {
      const response = await fetch('/api/stops');
      if (!response.ok) throw new Error('Failed to load stops');
      
      const data = await response.json();
      setStops(data.stops || []);
    } catch (err) {
      setError('Failed to load stops');
    }
  };

  const loadArrivals = async (stopId: string) => {
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

  const handleStopSelect = (stop: Stop) => {
    setSelectedStop(stop);
    setSearchQuery('');
  };

  const handleScanQR = () => {
    setShowScanner(true);
    // In a real implementation, you would use a QR scanner library
    // For now, we'll just show a message
    alert('QR Scanner would open here. For now, please select a stop from the list.');
    setShowScanner(false);
  };

  const filteredStops = stops.filter(stop =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (minutes: number) => {
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, marginBottom: '10px' }}>🚌 Track Your Bus</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Find your stop to see live bus arrivals
        </p>
      </div>

      {/* Stop Selection */}
      {!selectedStop && (
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0 }}>Select Your Stop</h2>
          
          {/* QR Scanner Button */}
          <button
            onClick={handleScanQR}
            style={{
              width: '100%',
              padding: '15px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            📷 Scan QR Code at Stop
          </button>

          <div style={{
            textAlign: 'center',
            margin: '20px 0',
            color: '#999',
            fontSize: '14px'
          }}>
            OR
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search for your stop..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #007bff',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '15px'
            }}
          />

          {/* Stops List */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            {filteredStops.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#999'
              }}>
                {searchQuery ? 'No stops found' : 'No stops available'}
              </div>
            ) : (
              filteredStops.map(stop => (
                <div
                  key={stop.id}
                  onClick={() => handleStopSelect(stop)}
                  style={{
                    padding: '15px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f8ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                    🚏 {stop.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected Stop & Arrivals */}
      {selectedStop && (
        <>
          {/* Stop Header */}
          <div style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h2 style={{ margin: 0, marginBottom: '5px' }}>
                  🚏 {selectedStop.name}
                </h2>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStop(null);
                  setArrivals([]);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Change Stop
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          <div style={{ marginBottom: '20px', textAlign: 'right' }}>
            <button
              onClick={() => loadArrivals(selectedStop.id)}
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
                const statusColor = getStatusColor(arrival.estimatedMinutes);
                const confidenceLabel = getConfidenceLabel(arrival.confidenceScore);
                
                return (
                  <div
                    key={arrival.id}
                    style={{
                      background: 'white',
                      border: `3px solid ${statusColor}`,
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Bus Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
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
                        padding: '12px 20px',
                        borderRadius: '25px',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        minWidth: '120px'
                      }}>
                        {arrival.estimatedMinutes} min
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '15px',
                      padding: '15px',
                      background: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          Arriving At
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {formatTime(arrival.predictedArrival)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          Distance
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {arrival.distanceKm.toFixed(1)} km
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          Accuracy
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {confidenceLabel} ({(arrival.confidenceScore * 100).toFixed(0)}%)
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          Tracking
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {arrival.calculationMethod === 'gps_based' && '📡 GPS'}
                          {arrival.calculationMethod === 'hybrid' && '🔄 Hybrid'}
                          {arrival.calculationMethod === 'historical' && '📊 Historical'}
                        </div>
                      </div>
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
              <li>Arrival times based on current location and speed</li>
              <li>Accuracy improves with more data</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
