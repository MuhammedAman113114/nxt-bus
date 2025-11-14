import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Driver {
  id: string;
  driverId: string;
  driverEmail: string;
  status: string;
}

interface Bus {
  id: string;
  busName: string;
  registrationNumber: string;
  status: string;
  routeName?: string;
  assignedDrivers: Driver[];
}

interface AvailableDriver {
  id: string;
  email: string;
  assignedBusesCount: number;
  createdAt: string;
}

interface Analytics {
  totalBuses: number;
  activeBuses: number;
  totalTrips: number;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ totalBuses: 0, activeBuses: 0, totalTrips: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      if (userData.role !== 'owner') {
        navigate('/');
        return;
      }
      
      loadData();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [busesRes, driversRes, analyticsRes] = await Promise.all([
        fetch('/api/owner/buses', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json()),
        fetch('/api/owner/drivers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json()),
        fetch('/api/owner/analytics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json())
      ]);

      setBuses(busesRes.buses || []);
      setDrivers(driversRes.drivers || []);
      setAnalytics(analyticsRes || { totalBuses: 0, activeBuses: 0, totalTrips: 0 });
      
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedBus || !selectedDriver) return;

    try {
      const response = await fetch('/api/owner/assign-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          busId: selectedBus.id,
          driverId: selectedDriver
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign driver');
      }

      setSuccess('Driver assigned successfully!');
      setShowAssignModal(false);
      setSelectedBus(null);
      setSelectedDriver('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign driver');
    }
  };

  const handleUnassignDriver = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to unassign this driver?')) return;

    try {
      const response = await fetch(`/api/owner/assign-driver/${assignmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (!response.ok) throw new Error('Failed to unassign driver');
      
      setSuccess('Driver unassigned successfully!');
      loadData();
    } catch (err) {
      setError('Failed to unassign driver');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚌</div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '5px' }}>🏢 Owner Dashboard</h1>
          <p style={{ margin: 0, color: '#666' }}>Welcome, {user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Analytics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '10px' }}>Total Buses</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{analytics.totalBuses}</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '10px' }}>Active Today</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{analytics.activeBuses}</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '10px' }}>Total Trips</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{analytics.totalTrips}</div>
        </div>
      </div>

      {/* My Buses */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginTop: 0 }}>🚌 My Buses</h2>
        
        {buses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚌</div>
            <p>No buses found</p>
            <p style={{ fontSize: '14px' }}>Contact admin to add buses to your account</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {buses.map(bus => (
              <div
                key={bus.id}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>
                    🚌 {bus.busName}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    {bus.registrationNumber}
                  </div>
                  
                  {bus.routeName && (
                    <div style={{ fontSize: '14px', color: '#007bff', marginBottom: '5px' }}>
                      🛣️ Route: {bus.routeName}
                    </div>
                  )}
                  
                  <div style={{
                    fontSize: '12px',
                    color: bus.status === 'active' ? '#28a745' : '#dc3545',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginTop: '8px'
                  }}>
                    ● {bus.status}
                  </div>
                </div>

                {/* Assigned Drivers */}
                <div style={{ marginBottom: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                    👥 Assigned Drivers ({bus.assignedDrivers?.length || 0})
                  </div>
                  {bus.assignedDrivers && bus.assignedDrivers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {bus.assignedDrivers.map((driver: Driver) => (
                        <div
                          key={driver.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            background: '#f8f9fa',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        >
                          <span>📧 {driver.driverEmail}</span>
                          <button
                            onClick={() => handleUnassignDriver(driver.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                      No drivers assigned
                    </div>
                  )}
                </div>

                {/* Assign Driver Button */}
                <button
                  onClick={() => {
                    setSelectedBus(bus);
                    setShowAssignModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  + Assign Driver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#d4edda',
          color: '#155724',
          padding: '15px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          ✅ {success}
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#f8d7da',
          color: '#721c24',
          padding: '15px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          ❌ {error}
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssignModal && selectedBus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>Assign Driver to {selectedBus.busName}</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Select Driver:
              </label>
              
              {drivers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No drivers available. Please create driver accounts first.
                </div>
              ) : (
                drivers.map(driver => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver.id)}
                    style={{
                      padding: '12px',
                      border: selectedDriver === driver.id ? '2px solid #007bff' : '1px solid #ddd',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      background: selectedDriver === driver.id ? '#e7f3ff' : 'white'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{driver.email}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      Currently assigned to {driver.assignedBusesCount} bus(es)
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAssignDriver}
                disabled={!selectedDriver}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedDriver ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedDriver ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold'
                }}
              >
                Assign Driver
              </button>
              
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBus(null);
                  setSelectedDriver('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

