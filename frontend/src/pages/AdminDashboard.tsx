import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface Bus {
  id: string;
  busNumber: string;
  registrationNumber: string;
  capacity: number;
  routeId?: string;
  routeName?: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
}

interface Route {
  id: string;
  name: string;
  description: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    busNumber: '',
    registrationNumber: '',
    capacity: 40,
    routeId: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance'
  });

  useEffect(() => {
    // Check admin authentication
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Redirect if not an admin
      if (userData.role !== 'admin') {
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
      
      const [busesResponse, routesResponse] = await Promise.all([
        fetch('/api/buses', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }).then(async r => {
          if (!r.ok) {
            const errorData = await r.json().catch(() => ({ error: 'Failed to fetch buses' }));
            throw new Error(errorData.error || 'Failed to fetch buses');
          }
          return r.json();
        }),
        apiService.getAllRoutes()
      ]);

      console.log('✅ Loaded buses:', busesResponse.buses?.length || 0);
      console.log('✅ Loaded routes:', routesResponse.routes?.length || 0);
      
      setBuses(busesResponse.buses || []);
      setRoutes(routesResponse.routes || []);
    } catch (err: any) {
      console.error('❌ Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let response;
      if (editingBus) {
        // Update existing bus
        response = await fetch(`/api/buses/${editingBus.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(formData)
        });
      } else {
        // Add new bus
        response = await fetch('/api/buses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save bus' }));
        throw new Error(errorData.error || 'Failed to save bus');
      }

      setSuccess(editingBus ? 'Bus updated successfully!' : 'Bus added successfully!');

      // Reset form
      setFormData({
        busNumber: '',
        registrationNumber: '',
        capacity: 40,
        routeId: '',
        status: 'active'
      });
      setShowAddForm(false);
      setEditingBus(null);
      
      // Reload data
      await loadData();
    } catch (err: any) {
      console.error('Error saving bus:', err);
      setError(err.message || 'Failed to save bus');
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      busNumber: bus.busNumber,
      registrationNumber: bus.registrationNumber,
      capacity: bus.capacity,
      routeId: bus.routeId || '',
      status: bus.status
    });
    setShowAddForm(true);
  };

  const handleDelete = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    try {
      await fetch(`/api/buses/${busId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      setSuccess('Bus deleted successfully!');
      loadData();
    } catch (err) {
      setError('Failed to delete bus');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'inactive': return '#6c757d';
      case 'maintenance': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚌</div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ← Back to Home
          </button>
          
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🚌 Bus Management</h1>
            <p style={{ margin: 0, color: '#666' }}>
              Add and manage buses for your routes
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/admin/owners')}
              style={{
                padding: '12px 24px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              👤 Manage Owners
            </button>
            
            <button
              onClick={() => navigate('/admin/stops')}
              style={{
                padding: '12px 24px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              🚏 Manage Stops
            </button>
            
            <button
              onClick={() => navigate('/admin/routes')}
              style={{
                padding: '12px 24px',
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              🛣️ Manage Routes
            </button>
            
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingBus(null);
                setFormData({
                  busNumber: '',
                  registrationNumber: '',
                  capacity: 40,
                  routeId: '',
                  status: 'active'
                });
              }}
              style={{
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              + Add New Bus
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          ✅ {success}
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

      {/* Add/Edit Form */}
      {showAddForm && (
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0 }}>
            {editingBus ? 'Edit Bus' : 'Add New Bus'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Bus Number *
                </label>
                <input
                  type="text"
                  value={formData.busNumber}
                  onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                  required
                  placeholder="e.g., BUS-001"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Registration Number *
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  required
                  placeholder="e.g., KA-01-AB-1234"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Capacity (seats)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  min="10"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Assign to Route
                </label>
                <select
                  value={formData.routeId}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">No Route (Unassigned)</option>
                  {routes.map(route => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {editingBus ? 'Update Bus' : 'Add Bus'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingBus(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bus List */}
      <div>
        <h2>All Buses ({buses.length})</h2>
        
        {buses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚌</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Buses Yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Add your first bus to get started
            </p>
            <button
              onClick={() => setShowAddForm(true)}
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
              Add First Bus
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {buses.map(bus => (
              <div
                key={bus.id}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>
                      🚌 {bus.busNumber}
                    </h3>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {bus.registrationNumber}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: `${getStatusColor(bus.status)}20`,
                    color: getStatusColor(bus.status),
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getStatusColor(bus.status)
                    }} />
                    {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Capacity:</strong> {bus.capacity} seats
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Route:</strong> {bus.routeName || 'Not assigned'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Added: {new Date(bus.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <button
                    onClick={() => handleEdit(bus)}
                    style={{
                      flex: 1,
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
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(bus.id)}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
