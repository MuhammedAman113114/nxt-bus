import { useEffect, useState } from 'react';
import notificationService from '../services/notification.service';

interface Notification {
  id: string;
  type: 'arrival' | 'delay' | 'route-status' | 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Listen for in-app notifications
    const handleNotification = (data: any) => {
      const notification: Notification = {
        id: Date.now().toString(),
        type: data.type || 'info',
        title: data.title || 'Notification',
        message: data.message || data.body || '',
        timestamp: new Date(),
        read: false,
        data: data.data
      };

      setNotifications(prev => [notification, ...prev]);

      // Auto-remove after 10 seconds if not in history view
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 10000);
    };

    notificationService.on('notification:shown', handleNotification);
    notificationService.on('notification:in-app', handleNotification);

    return () => {
      notificationService.off('notification:shown', handleNotification);
      notificationService.off('notification:in-app', handleNotification);
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'arrival': return '🚌';
      case 'delay': return '⚠️';
      case 'route-status': return '🛣️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'arrival': return { bg: '#e7f3ff', border: '#b3d9ff', text: '#0066cc' };
      case 'delay': return { bg: '#fff3cd', border: '#ffc107', text: '#856404' };
      case 'route-status': return { bg: '#e7f9f0', border: '#b3e6cc', text: '#00994d' };
      case 'success': return { bg: '#d4edda', border: '#c3e6cb', text: '#155724' };
      case 'warning': return { bg: '#fff3cd', border: '#ffc107', text: '#856404' };
      case 'error': return { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' };
      default: return { bg: '#e7f3ff', border: '#b3d9ff', text: '#0066cc' };
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 3);

  return (
    <>
      {/* Notification bell icon */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9998
      }}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            position: 'relative',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'white',
            border: '2px solid #ddd',
            cursor: 'pointer',
            fontSize: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '2px solid white'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification history panel */}
      {showHistory && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          width: '350px',
          maxHeight: '500px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9998,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '15px 20px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Notifications</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px'
          }}>
            {notifications.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔔</div>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => {
                const colors = getNotificationColor(notification.type);
                return (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    style={{
                      background: notification.read ? '#f8f9fa' : colors.bg,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      opacity: notification.read ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ fontSize: '20px' }}>
                            {getNotificationIcon(notification.type)}
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: colors.text }}>
                            {notification.title}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: colors.text, marginBottom: '5px' }}>
                          {notification.message}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          {notification.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#999',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0 5px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating notifications (recent, not in history view) */}
      {!showHistory && recentNotifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          width: '350px',
          zIndex: 9997,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {recentNotifications.map(notification => {
            const colors = getNotificationColor(notification.type);
            return (
              <div
                key={notification.id}
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '15px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>
                        {getNotificationIcon(notification.type)}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: colors.text }}>
                        {notification.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: colors.text }}>
                      {notification.message}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0 5px',
                      opacity: 0.7
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
