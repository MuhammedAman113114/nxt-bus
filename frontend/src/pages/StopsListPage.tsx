import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface BusStop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qrCode: string;
}

export default function StopsListPage() {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStops();
  }, []);

  const loadStops = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllStops();
      setStops(response.stops || []);
    } catch (err: any) {
      console.error('Error loading stops:', err);
      setError(err.response?.data?.error || 'Failed to load stops');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading stops...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#dc3545' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: '20px',
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
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#007bff',
          cursor: 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      >
        ← Back to Home
      </button>

      <h1 style={{ marginBottom: '30px' }}>🚏 All Bus Stops</h1>

      {stops.length === 0 ? (
        <p style={{ color: '#666' }}>No bus stops available</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {stops.map((stop) => (
            <div
              key={stop.id}
              onClick={() => navigate(`/stops/${stop.id}`)}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '18px' }}>
                    {stop.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    QR Code: {stop.qrCode}
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
                    📍 {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                  </p>
                </div>
                <div style={{ fontSize: '32px' }}>🚏</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
