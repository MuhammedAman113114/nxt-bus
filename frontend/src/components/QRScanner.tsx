import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface QRScannerProps {
  onScan?: (qrCode: string) => void;
  onClose?: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const navigate = useNavigate();
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraPermission('granted');
        setScanning(true);
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access to scan QR codes.');
        setCameraPermission('denied');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const startScanning = () => {
    // Scan every 500ms
    scanIntervalRef.current = setInterval(() => {
      scanQRCode();
    }, 500);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Simple QR code detection (in production, use a library like jsQR)
    // For now, we'll simulate detection with a manual input option
    detectQRCode(imageData);
  };

  const detectQRCode = (imageData: ImageData) => {
    // In production, use jsQR library:
    // import jsQR from 'jsqr';
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // if (code) {
    //   handleQRCodeDetected(code.data);
    // }

    // For now, this is a placeholder
    // The actual QR detection would happen here
  };

  const handleQRCodeDetected = async (qrCode: string) => {
    console.log('QR Code detected:', qrCode);
    
    // Stop scanning
    stopCamera();

    if (onScan) {
      onScan(qrCode);
    } else {
      // Default behavior: navigate to stop page
      try {
        let stopId: string;

        // Try to parse as JSON first (our QR code format)
        try {
          const qrData = JSON.parse(qrCode);
          if (qrData.type === 'bus_stop' && qrData.stopId) {
            stopId = qrData.stopId;
            console.log('Parsed QR data:', qrData);
            console.log('Stop ID:', stopId);
            
            // Navigate directly to stop page
            navigate(`/stops/${stopId}`);
            return;
          }
        } catch (parseError) {
          // Not JSON, treat as plain QR code
          console.log('QR code is not JSON, treating as plain code');
        }

        // Fallback: try API lookup by QR code
        const response = await apiService.getStopByQRCode(qrCode);
        console.log('API Response:', response);
        
        // Handle different response structures
        stopId = response.stop?.id || response.id;
        
        if (stopId) {
          navigate(`/stops/${stopId}`);
        } else {
          throw new Error('No stop ID in response');
        }
      } catch (err: any) {
        console.error('QR Code lookup error:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Invalid QR code or stop not found';
        setError(errorMsg);
        
        // Show error for 3 seconds then restart camera
        setTimeout(() => {
          setError('');
          startCamera();
        }, 3000);
      }
    }
  };

  const handleManualInput = () => {
    const qrCode = prompt('Enter QR code manually:');
    if (qrCode) {
      handleQRCodeDetected(qrCode);
    }
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Scan QR Code</h2>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '5px 10px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Camera View */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {cameraPermission === 'granted' && (
          <>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              playsInline
            />
            
            {/* Scanning overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '250px',
              height: '250px',
              border: '3px solid #00ff00',
              borderRadius: '10px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-3px',
                left: '-3px',
                width: '30px',
                height: '30px',
                borderTop: '5px solid #00ff00',
                borderLeft: '5px solid #00ff00'
              }} />
              <div style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '30px',
                height: '30px',
                borderTop: '5px solid #00ff00',
                borderRight: '5px solid #00ff00'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-3px',
                left: '-3px',
                width: '30px',
                height: '30px',
                borderBottom: '5px solid #00ff00',
                borderLeft: '5px solid #00ff00'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-3px',
                right: '-3px',
                width: '30px',
                height: '30px',
                borderBottom: '5px solid #00ff00',
                borderRight: '5px solid #00ff00'
              }} />
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.95)',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '80%'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📷</div>
            <p style={{ color: '#d32f2f', marginBottom: '20px' }}>{error}</p>
            {cameraPermission === 'denied' && (
              <p style={{ fontSize: '14px', color: '#666' }}>
                Please enable camera access in your browser settings
              </p>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        padding: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
          Point your camera at the QR code on the bus stop
        </p>
        <button
          onClick={handleManualInput}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Enter Code Manually
        </button>
      </div>
    </div>
  );
}
