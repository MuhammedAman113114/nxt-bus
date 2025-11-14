import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Owner {
  id: string;
  name: string;
  contactNumber: string;
}

interface Bus {
  id: string;
  busName: string;
  registrationNumber: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

export default function AdminDashboardNew() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    busName: '',
    registrationNumber: '',
    ownerId: ''
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
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
      
      const [busesResponse, ownersResponse] = await Promise.all([
        fetch('/api/buses', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json()),
        fetch('/api/owners', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json())
      ]);

      setBuses(busesResponse.buses || []);
      setOwners(ownersResponse.owners || []);
    } catch (err: any) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.ownerId) {
      setError('Please select an owner');
      return;
    }

    try {
      const url = editingBus ? `/api/buses/${editingBus.id}` : '/api/buses';
      const method = editingBus ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          busNumber: formData.busName, // Backend still uses busNumber field
          registrationNumber: formData.registrationNumber,
          ownerId: formData.ownerId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingBus ? 'update' : 'add'} bus`);
      }

      setSuccess(`Bus ${editingBus ? 'updated' : 'added'} successfully!`);
      setFormData({ busName: '', registrationNumber: '', ownerId: '' });
      setShowAddForm(false);
      setEditingBus(null);
      setOwnerSearch('');
      loadData();
    } catch (err: any) {
      setError(err.message || `Failed to ${editingBus ? 'update' : 'add'} bus`);
    }
  };

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setFormData({
      busName: bus.busName,
      registrationNumber: bus.registrationNumber,
      ownerId: bus.ownerId
    });
    setShowAddForm(true);
  };

  const handleDelete = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;

    try {
      const response = await fetch(`/api/buses/${busId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (!response.ok) throw new Error('Failed to delete bus');
      
      setSuccess('Bus deleted successfully!');
      loadData();
    } catch (err) {
      setError('Failed to delete bus');
    }
  };

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
    owner.contactNumber.includes(ownerSearch)
  );

  const selectedOwner = owners.find(o => o.id === formData.ownerId);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚌</div>
        <p>Loading...</p>
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
                setFormData({ busName: '', registrationNumber: '', ownerId: '' });
                setOwnerSearch('');
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

      {/* Messages */}
      {success && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
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
          marginBottom: '20px'
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Bus Name *
              </label>
              <input
                type="text"
                value={formData.busName}
                onChange={(e) => setFormData({ ...formData, busName: e.target.value })}
                required
                placeholder="e.g., City Express"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
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

            {/* Owner Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Owner *
              </label>
              
              {selectedOwner ? (
                <div style={{
                  background: '#d4edda',
                  border: '2px solid #28a745',
                  borderRadius: '8px',
                  padding: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#155724' }}>
                      ✅ {selectedOwner.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#155724' }}>
                      📞 {selectedOwner.contactNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, ownerId: '' })}
                    style={{
                      padding: '8px 16px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="🔍 Search owner by name or phone..."
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      marginBottom: '15px'
                    }}
                  />

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '10px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '10px',
                    background: '#f8f9fa',
                    borderRadius: '6px'
                  }}>
                    {filteredOwners.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        No owners found. Please add owners first.
                      </div>
                    ) : (
                      filteredOwners.map(owner => (
                        <div
                          key={owner.id}
                          onClick={() => setFormData({ ...formData, ownerId: owner.id })}
                          style={{
                            background: 'white',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            padding: '15px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#007bff';
                            e.currentTarget.style.background = '#e7f3ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#ddd';
                            e.currentTarget.style.background = 'white';
                          }}
                        >
                          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                            👤 {owner.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            📞 {owner.contactNumber}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={!formData.ownerId}
                style={{
                  padding: '12px 24px',
                  background: !formData.ownerId ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !formData.ownerId ? 'not-allowed' : 'pointer',
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
                  setOwnerSearch('');
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
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>
                    🚌 {bus.busName}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    {bus.registrationNumber}
                  </div>
                  <div style={{ fontSize: '14px', color: '#007bff', fontWeight: 'bold' }}>
                    👤 Owner: {bus.ownerName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    Added: {new Date(bus.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <button
                    onClick={() => handleEdit(bus)}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ Edit
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
                    🗑️ Delete
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

