import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function QRRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleQRData();
  }, []);

  const handleQRData = () => {
    try {
      // Try to get stop ID from URL parameters
      const stopId = searchParams.get('stopId');
      const stopName = searchParams.get('stopName');
      
      // Also check for 'data' parameter which might contain JSON
      const dataParam = searchParams.get('data');
      
      if (stopId) {
        // Direct stop ID in URL
        console.log('Redirecting to stop:', stopId);
        navigate(`/stops/${stopId}`);
        return;
      }
      
      if (dataParam) {
        // Parse JSON data
        try {
          const qrData = JSON.parse(decodeURIComponent(dataParam));
          if (qrData.stopId) {
            console.log('Parsed QR data:', qrData);
            navigate(`/stops/${qrData.stopId}`);
            return;
          }
        } catch (e) {
          console.error('Failed to parse data parameter:', e);
        }
      }
      
      // If we get here, show error
      setError('Invalid QR code. Missing stop information.');
      setLoading(false);
      
    } catch (err) {
      console.error('QR redirect error:', err);
      setError('Failed to process QR code');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚌</div>
          <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>Loading Bus Stop...</h2>
          <p style={{ color: '#666', margin: 0 }}>Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>Error</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
