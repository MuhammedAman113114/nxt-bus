import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface Route {
  id: string;
  name: string;
  description: string;
  activeBuses?: number;
}

export default function RoutesListPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllRoutes();
      setRoutes(response.routes || []);
    } catch (err: any) {
      console.error('Error loading routes:', err);
      setError(err.response?.data?.error || 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛣️</div>
        <p>Loading routes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <p style={{ color: '#dc3545', marginBottom: '20px' }}>{error}</p>
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
        
        <h1 style={{ margin: 0, marginBottom: '10px' }}>🛣️ All Routes</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Browse all available bus routes
        </p>
      </div>

      {/* Routes grid */}
      {routes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛣️</div>
          <h2 style={{ color: '#666', marginBottom: '10px' }}>No Routes Available</h2>
          <p style={{ color: '#999' }}>Check back later for route information</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {routes.map((route) => (
            <div
              key={route.id}
              onClick={() => navigate(`/routes/${route.id}`)}
              style={{
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Route icon */}
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #007bff, #0056b3)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                marginBottom: '15px'
              }}>
                🛣️
              </div>

              {/* Route name */}
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '20px',
                color: '#333'
              }}>
                {route.name}
              </h3>

              {/* Route description */}
              <p style={{
                margin: '0 0 15px 0',
                color: '#666',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {route.description}
              </p>

              {/* Active buses badge */}
              {route.activeBuses !== undefined && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: route.activeBuses > 0 ? '#e7f9f0' : '#f8f9fa',
                  color: route.activeBuses > 0 ? '#00994d' : '#666',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}>
                  <span>{route.activeBuses > 0 ? '🚌' : '⏸️'}</span>
                  <span>
                    {route.activeBuses > 0 
                      ? `${route.activeBuses} Active ${route.activeBuses === 1 ? 'Bus' : 'Buses'}`
                      : 'No Active Buses'
                    }
                  </span>
                </div>
              )}

              {/* View details arrow */}
              <div style={{
                marginTop: '15px',
                paddingTop: '15px',
                borderTop: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#007bff',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                <span>View Route Details</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div style={{
        marginTop: '40px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0066cc' }}>
          💡 About Routes
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0066cc' }}>
          <li>Click on any route to see detailed information</li>
          <li>View all stops along the route in order</li>
          <li>See active buses currently on the route</li>
          <li>Check distances between stops</li>
          <li>Get real-time updates on bus locations</li>
        </ul>
      </div>
    </div>
  );
}
