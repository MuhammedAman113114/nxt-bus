import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Bus {
  id: string;
  busNumber: string;
}

interface Route {
  id: string;
  name: string;
}

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface LocationData {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [currentStop, setCurrentStop] = useState<string>('');
  
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationCount, setLocationCount] = useState(0);
  
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      if (userData.role !== 'driver' && userData.role !== 'admin') {
        navigate('/');
        return;
      }
      
      loadData();
    } else {
      navigate('/login');
    }

    return () => {
      stopTracking();
    };
  }, [navigate]);

  const loadData = async () => {
    try {
      // Load only allowed buses for driver
      const busesRes = await fetch('/api/driver-assignment/my-allowed-buses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(r => r.json());
      
      // Map the allowed buses response to match expected format
      const allowedBuses = (busesRes.buses || []).map((b: any) => ({
        id: b.bus_id,
        busNumber: b.bus_number,
        isPrimary: b.is_primary,
        isAssigned: b.is_assigned
      }));
      
      setBuses(allowedBuses);
      
      // Load all routes to get route details
      const routesRes = await fetch('/api/routes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(r => r.json());
      
      // Filter routes to only show routes that have buses assigned to the driver
      const allRoutes = routesRes.routes || [];
      const busIds = allowedBuses.map((b: any) => b.id);
      
      // Filter routes where the bus_id matches one of the driver's allowed buses
      const driverRoutes = allRoutes.filter((route: any) => 
        route.busId && busIds.includes(route.busId)
      );
      
      setRoutes(driverRoutes);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const loadRouteStops = async (routeId: string) => {
    try {
      const response = await fetch(`/api/routes/${routeId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setStops(data.route?.stops || []);
    } catch (err) {
      console.error('Failed to load stops:', err);
    }
  };

  const startTracking = () => {
    if (!selectedBus) {
      setError('Please select a bus first');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError('');
    setSuccess('GPS tracking started');
    setLocationCount(0);

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // m/s to km/h
          heading: position.coords.heading || 0,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        };
        setLocation(locationData);
      },
      (err) => {
        setError(`GPS Error: ${err.message}`);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Send location to server every 15 seconds
    intervalRef.current = setInterval(() => {
      sendLocationToServer();
    }, 15000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setSuccess('GPS tracking stopped');
  };

  const sendLocationToServer = async () => {
    if (!location || !selectedBus) return;

    try {
      // Send to both endpoints for compatibility
      const [gpsResponse, etaResponse] = await Promise.all([
        // Original GPS endpoint
        fetch('/api/gps/location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            busId: selectedBus,
            routeId: selectedRoute || undefined,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed,
            heading: location.heading,
            accuracy: location.accuracy
          })
        }),
        // ETA system endpoint
        fetch('/api/update-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            busId: selectedBus,
            lat: location.latitude,
            lon: location.longitude,
            timestamp: Date.now()
          })
        })
      ]);

      if (!gpsResponse.ok && !etaResponse.ok) {
        throw new Error('Failed to send location to both endpoints');
      }
      
      setLocationCount(prev => prev + 1);
      setSuccess(`Location sent (${locationCount + 1} updates)`);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      console.error('Error sending location:', err);
      setError('Failed to send location to server');
    }
  };

  const recordArrival = async () => {
    if (!selectedBus || !selectedRoute || !currentStop) {
      setError('Please select bus, route, and current stop');
      return;
    }

    try {
      const response = await fetch('/api/gps/arrival', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          busId: selectedBus,
          routeId: selectedRoute,
          stopId: currentStop
        })
      });

      if (!response.ok) throw new Error('Failed to record arrival');
      
      setSuccess('Arrival recorded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to record arrival');
    }
  };

  const recordDeparture = async () => {
    if (!selectedBus || !currentStop) {
      setError('Please select bus and current stop');
      return;
    }

    try {
      const response = await fetch('/api/gps/departure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          busId: selectedBus,
          stopId: currentStop
        })
      });

      if (!response.ok) throw new Error('Failed to record departure');
      
      setSuccess('Departure recorded successfully!');
      setCurrentStop(''); // Clear current stop after departure
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to record departure');
    }
  };

  const selectedBusData = buses.find(b => b.id === selectedBus);
  const selectedRouteData = routes.find(r => r.id === selectedRoute);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, marginBottom: '5px' }}>🚌 Driver Dashboard</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Welcome, {user?.name || 'Driver'}
        </p>
      </div>

      {/* Messages */}
      {success && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ✅ {success}
        </div>
      )}

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

      {/* Bus & Route Selection */}
      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0 }}>Select Bus & Route</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select Bus *
          </label>
          <select
            value={selectedBus}
            onChange={(e) => setSelectedBus(e.target.value)}
            disabled={isTracking}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">-- Select Bus --</option>
            
            {/* Assigned Buses */}
            {buses.filter((b: any) => b.isAssigned).length > 0 && (
              <optgroup label="✓ Your Assigned Buses">
                {buses.filter((b: any) => b.isAssigned).map(bus => (
                  <option key={bus.id} value={bus.id}>
                    {bus.busNumber} {(bus as any).isPrimary ? '⭐ (Primary)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            
            {/* Same-Name Buses */}
            {buses.filter((b: any) => !b.isAssigned).length > 0 && (
              <optgroup label="🔄 Same-Name Buses (Can Switch)">
                {buses.filter((b: any) => !b.isAssigned).map(bus => (
                  <option key={bus.id} value={bus.id}>
                    {bus.busNumber}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select Route (Optional)
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => {
              setSelectedRoute(e.target.value);
              if (e.target.value) loadRouteStops(e.target.value);
            }}
            disabled={isTracking}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="">-- Select Route --</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </div>

        {/* Info about bus assignments */}
        {buses.length > 0 && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginTop: '10px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>ℹ️ Bus Assignment Info:</div>
            <div>• You can use {buses.filter((b: any) => b.isAssigned).length} assigned bus(es)</div>
            <div>• You can switch to {buses.filter((b: any) => !b.isAssigned).length} same-name bus(es)</div>
            {buses.filter((b: any) => !b.isAssigned).length > 0 && (
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#856404' }}>
                Same-name buses allow you to switch without admin approval
              </div>
            )}
          </div>
        )}

        {selectedBusData && (
          <div style={{
            background: '#e7f3ff',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '15px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              Selected: {selectedBusData.busNumber}
            </div>
            {selectedRouteData && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                Route: {selectedRouteData.name}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GPS Tracking Control */}
      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginTop: 0 }}>GPS Tracking</h2>
        
        {!isTracking ? (
          <button
            onClick={startTracking}
            disabled={!selectedBus}
            style={{
              width: '100%',
              padding: '15px',
              background: selectedBus ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: selectedBus ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            🟢 Start GPS Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            style={{
              width: '100%',
              padding: '15px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            🔴 Stop GPS Tracking
          </button>
        )}

        {location && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              Current Location:
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
              <div>📍 Lat: {location.latitude.toFixed(6)}</div>
              <div>📍 Lng: {location.longitude.toFixed(6)}</div>
              <div>🚀 Speed: {location.speed.toFixed(1)} km/h</div>
              <div>🧭 Heading: {location.heading.toFixed(0)}°</div>
              <div>🎯 Accuracy: {location.accuracy.toFixed(0)}m</div>
              <div>📊 Updates Sent: {locationCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stop Management */}
      {selectedRoute && stops.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0 }}>Stop Management</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Current Stop
            </label>
            <select
              value={currentStop}
              onChange={(e) => setCurrentStop(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">-- Select Current Stop --</option>
              {stops.map(stop => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={recordArrival}
              disabled={!currentStop}
              style={{
                padding: '12px',
                background: currentStop ? '#007bff' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentStop ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ✅ Record Arrival
            </button>
            
            <button
              onClick={recordDeparture}
              disabled={!currentStop}
              style={{
                padding: '12px',
                background: currentStop ? '#ffc107' : '#ccc',
                color: currentStop ? '#000' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentStop ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🚀 Record Departure
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '15px',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>📋 Instructions:</div>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Select your bus and route</li>
          <li>Click "Start GPS Tracking"</li>
          <li>Keep this page open while driving</li>
          <li>Location updates every 15 seconds automatically</li>
          <li>Record arrival/departure at each stop</li>
        </ol>
      </div>
    </div>
  );
}
