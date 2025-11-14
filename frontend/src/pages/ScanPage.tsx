import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';

export default function ScanPage() {
  const navigate = useNavigate();

  const handleScan = (qrCode: string) => {
    console.log('Scanned:', qrCode);
    // Navigation is handled by the QRScanner component
  };

  const handleClose = () => {
    navigate('/');
  };

  return (
    <QRScanner onScan={handleScan} onClose={handleClose} />
  );
}
