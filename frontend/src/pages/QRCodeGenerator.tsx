import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

interface BusStop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qrCode: string;
}

export default function QRCodeGenerator() {
  const navigate = useNavigate();
  const [stops, setStops] = useState<BusStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== 'admin') {
      alert('Access denied. Admin only.');
      navigate('/');
      return;
    }

    loadStops();
  }, [navigate]);

  const loadStops = async () => {
    try {
      const response = await fetch('/api/stops', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setStops(data.stops || []);
    } catch (error) {
      console.error('Error loading stops:', error);
    }
  };

  const generateQRCode = async (stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop) return;

    setLoading(true);
    try {
      // Generate QR code data URL
      const qrData = JSON.stringify({
        stopId: stop.id,
        stopName: stop.name,
        lat: stop.location.latitude,
        lon: stop.location.longitude,
        type: 'bus_stop'
      });

      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleStopChange = (stopId: string) => {
    setSelectedStop(stopId);
    if (stopId) {
      generateQRCode(stopId);
    } else {
      setQrDataUrl('');
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl || !selectedStop) return;

    const stop = stops.find(s => s.id === selectedStop);
    if (!stop) return;

    const link = document.createElement('a');
    link.download = `qr-${stop.name.replace(/\s+/g, '-')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const downloadPDF = async () => {
    if (!selectedStop) return;

    const stop = stops.find(s => s.id === selectedStop);
    if (!stop) return;

    // Create a simple HTML page for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - ${stop.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .container {
            text-align: center;
            border: 2px solid #333;
            padding: 30px;
            border-radius: 10px;
          }
          h1 {
            margin: 0 0 10px 0;
            color: #667eea;
          }
          .subtitle {
            color: #666;
            margin-bottom: 30px;
          }
          img {
            max-width: 400px;
            height: auto;
          }
          .instructions {
            margin-top: 30px;
            font-size: 14px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚌 NXT Bus</h1>
          <h2>${stop.name}</h2>
          <p class="subtitle">Scan to view real-time bus arrivals</p>
          <img src="${qrDataUrl}" alt="QR Code" />
          <div class="instructions">
            <p><strong>Instructions:</strong></p>
            <p>1. Open NXT Bus app or website</p>
            <p>2. Scan this QR code</p>
            <p>3. View real-time bus arrivals</p>
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, color: '#667eea' }}>QR Code Generator</h1>
            <button
              onClick={() => navigate('/admin')}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ← Back to Admin
            </button>
          </div>
        </div>

        {/* Stop Selection */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0 }}>Select Bus Stop</h2>
          <select
            value={selectedStop}
            onChange={(e) => handleStopChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '5px',
              marginBottom: '20px'
            }}
          >
            <option value="">-- Select a bus stop --</option>
            {stops.map(stop => (
              <option key={stop.id} value={stop.id}>
                {stop.name}
              </option>
            ))}
          </select>

          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Generating QR code...
            </div>
          )}

          {qrDataUrl && !loading && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#f8f9fa',
                padding: '30px',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  style={{
                    maxWidth: '400px',
                    width: '100%',
                    height: 'auto',
                    border: '2px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={downloadQRCode}
                  style={{
                    padding: '12px 24px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  📥 Download PNG
                </button>
                <button
                  onClick={downloadPDF}
                  style={{
                    padding: '12px 24px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  🖨️ Print PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>How to Use</h3>
          <ol style={{ lineHeight: '1.8' }}>
            <li>Select a bus stop from the dropdown</li>
            <li>QR code will be generated automatically</li>
            <li>Download as PNG image or print as PDF</li>
            <li>Place the QR code at the bus stop</li>
            <li>Passengers can scan to view real-time arrivals</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
