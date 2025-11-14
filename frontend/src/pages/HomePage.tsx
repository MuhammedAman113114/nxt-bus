import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';
import websocketService from '../services/websocket.service';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    loadData();
    websocketService.connect();

    return () => {
      websocketService.disconnect();
    };
  }, [navigate]);

  const loadData = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData.user);

      const routesData = await apiService.getAllRoutes();
      setRoutes(routesData.routes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      websocketService.disconnect();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>🚍 nxt-bus</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>
            Welcome, {user?.email} ({user?.role})
          </span>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            👤 Profile
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Available Routes</h2>
        {routes.length === 0 ? (
          <p>No routes available</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {routes.map((route) => (
              <div
                key={route.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => navigate(`/route/${route.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <h3 style={{ marginTop: 0 }}>{route.name}</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>{route.description}</p>
                <div style={{ marginTop: '10px', fontSize: '14px' }}>
                  <span style={{ color: route.activeBuses > 0 ? '#28a745' : '#dc3545' }}>
                    ● {route.activeBuses} active {route.activeBuses === 1 ? 'bus' : 'buses'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/scan')}
            style={{
              padding: '15px 30px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            📱 Scan QR Code
          </button>
          <button
            onClick={() => navigate('/buses')}
            style={{
              padding: '15px 30px',
              backgroundColor: '#fd7e14',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🚌 Track Buses
          </button>
          <button
            onClick={() => navigate('/routes')}
            style={{
              padding: '15px 30px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🛣️ Browse Routes
          </button>
          <button
            onClick={() => navigate('/stops')}
            style={{
              padding: '15px 30px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🚏 Browse Stops
          </button>
          <button
            onClick={() => navigate('/nearby')}
            style={{
              padding: '15px 30px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            📍 Find Nearby Stops
          </button>
          <button
            onClick={() => navigate('/subscriptions')}
            style={{
              padding: '15px 30px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🔔 My Subscriptions
          </button>
        </div>
      </div>
    </div>
  );
}
