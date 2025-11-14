import { useState, useEffect } from 'react';
import notificationService from '../services/notification.service';

export default function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if we should show the prompt
    const currentPermission = notificationService.getPermission();
    setPermission(currentPermission);

    // Show prompt if permission is default and user hasn't dismissed it
    const dismissed = localStorage.getItem('notification-prompt-dismissed');
    if (currentPermission === 'default' && !dismissed) {
      // Show after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }
  }, []);

  const handleAllow = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setPermission('granted');
      setShowPrompt(false);
      
      // Show a test notification
      notificationService.showNotification('Notifications Enabled! 🎉', {
        body: 'You will now receive bus arrival alerts',
        tag: 'welcome'
      });
    } else {
      setPermission('denied');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    // Don't set dismissed flag, so it can show again later
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '500px',
      width: 'calc(100% - 40px)',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
        <div style={{ fontSize: '40px' }}>🔔</div>
        
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
            Enable Bus Notifications
          </h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
            Get notified when your bus is approaching. We'll send you timely alerts so you never miss your ride.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleAllow}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ✓ Allow Notifications
            </button>
            
            <button
              onClick={handleNotNow}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Not Now
            </button>
            
            <button
              onClick={handleDismiss}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Don't Ask Again
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0 5px'
          }}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
