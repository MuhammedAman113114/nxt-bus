import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  busCount: number;
  createdAt: string;
}

export default function AdminOwnersManagement() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check admin authentication
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      
      if (userData.role !== 'admin') {
        navigate('/');
        return;
      }
      
      loadOwners();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadOwners = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/owners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch owners' }));
        throw new Error(errorData.error || 'Failed to fetch owners');
      }
      
      const data = await response.json();
      console.log('✅ Loaded owners:', data.owners?.length || 0);
      setOwners(data.owners || []);
    } catch (err: any) {
      console.error('❌ Error loading owners:', err);
      setError(err.message || 'Failed to load owners');
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
      if (editingOwner) {
        // Update existing owner
        response = await fetch(`/api/owners/${editingOwner.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(formData)
        });
      } else {
        // Add new owner
        response = await fetch('/api/owners', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save owner' }));
        throw new Error(errorData.error || 'Failed to save owner');
      }

      setSuccess(editingOwner ? 'Owner updated successfully!' : 'Owner added successfully!');

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        password: ''
      });
      setShowPassword(false); // Reset password visibility
      setShowAddForm(false);
      setEditingOwner(null);
      
      // Reload data
      await loadOwners();
    } catch (err: any) {
      console.error('❌ Error saving owner:', err);
      setError(err.message || 'Failed to save owner');
    }
  };

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email || '',
      phone: owner.phone,
      address: owner.address || '',
      password: '' // Don't populate password when editing
    });
    setShowPassword(false); // Reset password visibility
    setShowAddForm(true);
  };

  const handleDelete = async (ownerId: string) => {
    if (!confirm('Are you sure you want to delete this owner?')) return;

    try {
      const response = await fetch(`/api/owners/${ownerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setSuccess('Owner deleted successfully!');
      loadOwners();
    } catch (err: any) {
      setError(err.message || 'Failed to delete owner');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>👤</div>
        <p>Loading owners...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '10px'
          }}
        >
          ← Back to Admin Dashboard
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>👤 Bus Owners Management</h1>
            <p style={{ margin: 0, color: '#666' }}>
              Manage bus owners and their fleet
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingOwner(null);
              setFormData({
                name: '',
                email: '',
                phone: '',
                address: '',
                password: ''
              });
              setShowPassword(false); // Reset password visibility
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
            + Add New Owner
          </button>
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
            {editingOwner ? 'Edit Owner' : 'Add New Owner'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., John Doe"
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
                  Email {!editingOwner && '*'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required={!editingOwner}
                  placeholder="e.g., owner@example.com"
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
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="e.g., +91 9876543210"
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
                  Password {!editingOwner && '*'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingOwner}
                    placeholder={editingOwner ? "Leave blank to keep current" : "e.g., password123"}
                    minLength={8}
                    style={{
                      width: '100%',
                      padding: '10px',
                      paddingRight: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#666',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {!editingOwner && (
                  <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Owner will use this password to login
                  </small>
                )}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g., 123 Main Street, City"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
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
                {editingOwner ? 'Update Owner' : 'Add Owner'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingOwner(null);
                  setShowPassword(false); // Reset password visibility
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

      {/* Owners List */}
      <div>
        <h2>All Owners ({owners.length})</h2>
        
        {owners.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>👤</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Owners Yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Add your first bus owner to get started
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
              Add First Owner
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {owners.map(owner => (
              <div
                key={owner.id}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>
                    👤 {owner.name}
                  </h3>
                  
                  {owner.email && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      📧 {owner.email}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    📱 {owner.phone}
                  </div>
                  
                  {owner.address && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      📍 {owner.address}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#007bff', 
                    fontWeight: 'bold',
                    marginTop: '10px'
                  }}>
                    🚌 {owner.busCount} {owner.busCount === 1 ? 'Bus' : 'Buses'}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                    Added: {new Date(owner.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <button
                    onClick={() => handleEdit(owner)}
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
                    onClick={() => handleDelete(owner.id)}
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
