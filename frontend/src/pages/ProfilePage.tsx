import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Subscription {
  id: string;
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
  advanceMinutes: number;
  channels: string[];
  active: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const userResponse = await apiService.getCurrentUser();
      setUser(userResponse.user);

      // Load subscriptions
      const subsResponse = await apiService.getSubscriptions();
      setSubscriptions(subsResponse.subscriptions || []);
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.response?.data?.error || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (routeId: string, stopId: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this route?')) {
      return;
    }

    try {
      await apiService.unsubscribe(routeId, stopId);
      setSuccessMessage('Successfully unsubscribed');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reload subscriptions
      loadUserData();
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      setError(err.response?.data?.error || 'Failed to unsubscribe');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdatePreferences = async (
    subscriptionId: string,
    advanceMinutes: number,
    channels: string[]
  ) => {
    try {
      await apiService.updateSubscriptionPreferences(subscriptionId, advanceMinutes, channels);
      setSuccessMessage('Preferences updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reload subscriptions
      loadUserData();
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.response?.data?.error || 'Failed to update preferences');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>👤</div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Not Logged In</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Please log in to view your profile</p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Go to Login
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
        
        <h1 style={{ margin: 0, marginBottom: '5px' }}>👤 My Profile</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Manage your account and subscriptions
        </p>
      </div>

      {/* Success/Error messages */}
      {successMessage && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {/* User Info Section */}
      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Account Information</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Email Address
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {user.email}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Account Type
            </div>
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: user.role === 'driver' ? '#ffc107' : '#007bff',
              color: user.role === 'driver' ? '#000' : 'white',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}>
              {user.role}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Member Since
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🔔 My Subscriptions</h2>
          <button
            onClick={() => navigate('/routes')}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            + Add Subscription
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔔</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Subscriptions Yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Subscribe to routes to get arrival notifications
            </p>
            <button
              onClick={() => navigate('/routes')}
              style={{
                padding: '12px 24px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Browse Routes
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {subscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onUnsubscribe={handleUnsubscribe}
                onUpdatePreferences={handleUpdatePreferences}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: '30px',
        background: '#e7f3ff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', color: '#0066cc' }}>
          💡 About Subscriptions
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#0066cc' }}>
          <li>Get notified when buses are approaching your stop</li>
          <li>Set how many minutes in advance you want to be notified</li>
          <li>Choose notification channels (push, email, SMS)</li>
          <li>Manage all your subscriptions in one place</li>
          <li>Unsubscribe anytime with one click</li>
        </ul>
      </div>
    </div>
  );
}

// Subscription Card Component
interface SubscriptionCardProps {
  subscription: Subscription;
  onUnsubscribe: (routeId: string, stopId: string) => void;
  onUpdatePreferences: (subscriptionId: string, advanceMinutes: number, channels: string[]) => void;
}

function SubscriptionCard({ subscription, onUnsubscribe, onUpdatePreferences }: SubscriptionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [advanceMinutes, setAdvanceMinutes] = useState(subscription.advanceMinutes);
  const [channels, setChannels] = useState<string[]>(subscription.channels);
  const navigate = useNavigate();

  const handleSave = () => {
    onUpdatePreferences(subscription.id, advanceMinutes, channels);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setAdvanceMinutes(subscription.advanceMinutes);
    setChannels(subscription.channels);
    setIsEditing(false);
  };

  const toggleChannel = (channel: string) => {
    if (channels.includes(channel)) {
      setChannels(channels.filter(c => c !== channel));
    } else {
      setChannels([...channels, channel]);
    }
  };

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
            🛣️ {subscription.routeName}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            🚏 Stop: {subscription.stopName}
          </div>
          
          {!isEditing ? (
            <div style={{ fontSize: '14px', color: '#666' }}>
              <div style={{ marginBottom: '5px' }}>
                ⏱️ Notify {subscription.advanceMinutes} minutes before arrival
              </div>
              <div>
                📢 Channels: {subscription.channels.join(', ')}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '15px' }}>
              {/* Advance minutes selector */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Notify me (minutes before arrival):
                </label>
                <select
                  value={advanceMinutes}
                  onChange={(e) => setAdvanceMinutes(Number(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%',
                    maxWidth: '200px'
                  }}
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              {/* Channels selector */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Notification Channels:
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['push', 'email', 'sms'].map(channel => (
                    <label
                      key={channel}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        background: channels.includes(channel) ? '#007bff' : 'white',
                        color: channels.includes(channel) ? 'white' : '#666',
                        border: '1px solid #ddd',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: channels.includes(channel) ? 'bold' : 'normal'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                        style={{ margin: 0 }}
                      />
                      {channel.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: subscription.active ? '#d4edda' : '#f8d7da',
          color: subscription.active ? '#155724' : '#721c24',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: subscription.active ? '#28a745' : '#dc3545'
          }} />
          {subscription.active ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
        {!isEditing ? (
          <>
            <button
              onClick={() => navigate(`/stops/${subscription.stopId}`)}
              style={{
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              View Stop
            </button>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              Edit Preferences
            </button>
            <button
              onClick={() => onUnsubscribe(subscription.routeId, subscription.stopId)}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                marginLeft: 'auto'
              }}
            >
              Unsubscribe
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
