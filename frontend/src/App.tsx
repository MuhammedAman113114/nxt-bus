import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import PassengerSearch from './pages/PassengerSearch';
import StopLivePage from './pages/StopLivePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DriverGPSDashboard from './pages/DriverDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import ScanPage from './pages/ScanPage';
import BusStopPage from './pages/BusStopPage';
import StopsListPage from './pages/StopsListPage';
import RoutePage from './pages/RoutePage';
import RoutesListPage from './pages/RoutesListPage';
import BusesPage from './pages/BusesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboardNew';
import AdminStopsManagement from './pages/AdminStopsManagement';
import AdminRoutesManagement from './pages/AdminRoutesManagementNew';
import AdminOwnersManagement from './pages/AdminOwnersManagement';
import LiveBusArrivals from './pages/LiveBusArrivals';
import AdminLiveMap from './pages/AdminLiveMap';
import UserBusTracker from './pages/UserBusTracker';
import QRCodeGenerator from './pages/QRCodeGenerator';
import QRRedirect from './pages/QRRedirect';
import NotificationBanner from './components/NotificationBanner';
import NotificationPermission from './components/NotificationPermission';
import { setupOnlineStatus, setupServiceWorkerUpdate, updateServiceWorker } from './utils/pwa';
import websocketService from './services/websocket.service';
import notificationService from './services/notification.service';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Setup online/offline status
    const cleanup = setupOnlineStatus(
      () => setIsOnline(true),
      () => setIsOnline(false)
    );

    // Setup service worker update detection
    setupServiceWorkerUpdate(() => {
      setUpdateAvailable(true);
    });

    // Setup notification listeners for WebSocket events
    setupNotificationListeners();

    return cleanup;
  }, []);

  const setupNotificationListeners = () => {
    // Listen for bus arrival notifications
    websocketService.on('bus:arrival', (data: any) => {
      notificationService.showArrivalReminder(
        data.busId,
        data.stopName,
        data.eta
      );
      
      // Also show in-app notification
      notificationService.emit('notification:in-app', {
        type: 'arrival',
        title: 'Bus Arriving Soon!',
        message: `Bus ${data.busId.slice(0, 8)} will arrive at ${data.stopName} in ${data.eta} minutes`,
        data
      });
    });

    // Listen for delay alerts
    websocketService.on('bus:delay', (data: any) => {
      notificationService.showDelayAlert(
        data.busId,
        data.routeName,
        data.delayMinutes
      );
      
      // Also show in-app notification
      notificationService.emit('notification:in-app', {
        type: 'delay',
        title: 'Bus Delayed',
        message: `Bus ${data.busId.slice(0, 8)} on ${data.routeName} is delayed by ${data.delayMinutes} minutes`,
        data
      });
    });

    // Listen for route status updates
    websocketService.on('route:status', (data: any) => {
      notificationService.showRouteStatus(
        data.routeName,
        data.status,
        data.message
      );
      
      // Also show in-app notification
      notificationService.emit('notification:in-app', {
        type: 'route-status',
        title: `${data.routeName} - ${data.status}`,
        message: data.message,
        data
      });
    });
  };

  const handleUpdate = () => {
    updateServiceWorker();
  };

  return (
    <>
      {/* Notification System */}
      <NotificationBanner />
      <NotificationPermission />

      {/* Offline indicator */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#ff9800',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          zIndex: 9999,
          fontSize: '14px'
        }}>
          📡 You're offline - Some features may be limited
        </div>
      )}

      {/* Update available banner */}
      {updateAvailable && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#007bff',
          color: 'white',
          padding: '15px 25px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <span>New version available!</span>
          <button
            onClick={handleUpdate}
            style={{
              background: 'white',
              color: '#007bff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Update Now
          </button>
        </div>
      )}

      <Router>
        <Routes>
          <Route path="/" element={<PassengerSearch />} />
          <Route path="/stop/:stopId" element={<StopLivePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/track" element={<UserBusTracker />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/driver" element={<DriverGPSDashboard />} />
          <Route path="/driver/gps" element={<DriverGPSDashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/stops" element={<AdminStopsManagement />} />
          <Route path="/admin/routes" element={<AdminRoutesManagement />} />
          <Route path="/admin/owners" element={<AdminOwnersManagement />} />
          <Route path="/admin/live-map" element={<AdminLiveMap />} />
          <Route path="/admin/qr-generator" element={<QRCodeGenerator />} />
          <Route path="/live/:stopId" element={<LiveBusArrivals />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/qr" element={<QRRedirect />} />
          <Route path="/stops" element={<StopsListPage />} />
          <Route path="/stops/:stopId" element={<BusStopPage />} />
          <Route path="/routes" element={<RoutesListPage />} />
          <Route path="/routes/:id" element={<RoutePage />} />
          <Route path="/buses" element={<BusesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<div style={{ padding: '20px' }}>Page not found</div>} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
