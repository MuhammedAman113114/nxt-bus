import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BusList from '../components/BusList';
import apiService from '../services/api.service';
import websocketService from '../services/websocket.service';

interface BusLocation {
  busId: string;
  routeId?: string;
  routeName?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  timestamp: string;
  eta?: number;
  distance?: number;
  status?: 'active' | 'idle' | 'offline';
  delay?: number;
}

interface Route {
  id: string;
  name: string;
  description: string;
}

export default function BusesPage() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    setupWebSocket();

    return () => {
      // Cleanup WebSocket subscriptions
      routes.forEach(route => {
        websocketService.unsubscribeFromRoute(route.id);
      });
    };
  }, []);

  useEffect(() => {
    // Subscribe to selected route
    if (selectedRoute !== 'all') {
      websocketService.subscribeToRoute(selectedRoute);
    }
  }, [selectedRoute]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all routes
      const routesResponse = await apiService.getAllRoutes();
      const routesData = routesResponse.routes || [];
      setRoutes(routesData);

      // Load buses for all routes
      const allBuses: BusLocation[] = [];
      for (const route of routesData) {
        try {
          const busesResponse = await apiService.getActiveBusesOnRoute(route.id);
          const routeBuses = (busesResponse.buses || []).map((bus: any) => ({
            ...bus,
            routeId: route.id,
            routeName: route.name,
            status: bus.speed > 0 ? 'active' : 'idle'
          }));
          allBuses.push(...routeBuses);
        } catch (err) {
          console.warn(`Failed to load buses for route ${route.id}:`, err);
        }
      }
      
      setBuses(allBuses);
    } catch (err: any) {
      console.error('Error loading buses:', err);
      setError(err.response?.data?.error || 'Failed to load buses');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Listen for bus location updates
    websocketService.on('bus:location', (data: any) => {
      setBuses(prevBuses => {
        const updatedBuses = prevBuses.filter(bus => bus.busId !== data.busId);
        const updatedBus = {
          ...data,
          status: data.speed > 0 ? 'active' : 'idle'
        };
        return [...updatedBuses, updatedBus];
      });
    });

    // Listen for bus online/offline events
    websocketService.on('bus:online', (data: any) => {
      console.log('Bus came online:', data);
      loadData(); // Refresh all buses
    });

    websocketService.on('bus:offline', (data: any) => {
      console.log('Bus went offline:', data);
      setBuses(prevBuses => prevBuses.filter(bus => bus.busId !== data.busId));
    });

    // Listen for ETA updates
    websocketService.on('bus:eta', (data: any) => {
      setBuses(prevBuses => 
        prevBuses.map(bus => 
          bus.busId === data.busId 
            ? { ...bus, eta: data.eta, distance: data.distance }
            : bus
        )
      );
    });

    // Listen for delay alerts
    websocketService.on('bus:delay', (data: any) => {
      setBuses(prevBuses => 
        prevBuses.map(bus => 
          bus.busId === data.busId 
            ? { ...bus, delay: data.delayMinutes }
            : bus
        )
      );
    });
  };

  const handleRouteChange = (routeId: string) => {
    setSelectedRoute(routeId);
  };

  const handleBusClick = (bus: BusLocation) => {
    // Navigate to route page if route is available
    if (bus.routeId) {
      navigate(`/routes/${bus.routeId}`);
    }
  };

  const filteredBuses = selectedRoute === 'all'
    ? buses
    : buses.filter(bus => bus.routeId === selectedRoute);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚌</div>
        <p>Loading buses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Failed to Load Buses</h2>
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
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🚌 Active Buses</h1>
            <p style={{ margin: 0, color: '#666' }}>
              Real-time tracking of all buses
            </p>
          </div>

          {/* Route filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Filter by Route:</label>
            <select
              value={selectedRoute}
              onChange={(e) => handleRouteChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              <option value="all">All Routes ({buses.length} buses)</option>
              {routes.map(route => {
                const routeBusCount = buses.filter(b => b.routeId === route.id).length;
                return (
                  <option key={route.id} value={route.id}>
                    {route.name} ({routeBusCount} {routeBusCount === 1 ? 'bus' : 'buses'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: '#e7f9f0',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #b3e6cc'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚌</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00994d' }}>
            {filteredBuses.length}
          </div>
          <div style={{ fontSize: '14px', color: '#00994d' }}>
            {selectedRoute === 'all' ? 'Total Buses' : 'Buses on Route'}
          </div>
        </div>

        <div style={{
          background: '#e7f3ff',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #b3d9ff'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
            {filteredBuses.filter(b => b.status === 'active').length}
          </div>
          <div style={{ fontSize: '14px', color: '#0066cc' }}>Active Buses</div>
        </div>

        <div style={{
          background: '#fff3e0',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #ffcc80'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏸️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
            {filteredBuses.filter(b => b.status === 'idle').length}
          </div>
          <div style={{ fontSize: '14px', color: '#e65100' }}>Idle Buses</div>
        </div>

        <div style={{
          background: '#ffebee',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #ffcdd2'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>
            {filteredBuses.filter(b => b.delay && b.delay > 0).length}
          </div>
          <div style={{ fontSize: '14px', color: '#c62828' }}>Delayed Buses</div>
        </div>
      </div>

      {/* Bus list */}
      <BusList
        buses={filteredBuses}
        onBusClick={handleBusClick}
        showRoute={selectedRoute === 'all'}
      />

      {/* Info box */}
      <div style={{
        marginTop: '30px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0066cc' }}>
          💡 Bus Tracking Information
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0066cc' }}>
          <li>🟢 <strong>Active</strong> - Bus is moving and transmitting location</li>
          <li>🟡 <strong>Idle</strong> - Bus is stopped but online</li>
          <li>🔴 <strong>Offline</strong> - Bus is not transmitting location</li>
          <li>Click on any bus to view its route details</li>
          <li>Bus locations update in real-time every 5 seconds</li>
          <li>Sort buses by ETA, distance, status, or last update time</li>
        </ul>
      </div>
    </div>
  );
}
