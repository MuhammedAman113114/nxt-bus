import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface RouteStop extends Stop {
  order: number;
  distanceFromPrevious?: number;
}

interface Route {
  id: string;
  name: string;
  description: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  reachingTime: string;
  stops: RouteStop[];
  totalDistance?: number;
  createdAt: string;
}

export default function AdminRoutesManagement() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fromLocation: '',
    toLocation: '',
    departureTime: '',
    reachingTime: ''
  });
  const [selectedStops, setSelectedStops] = useState<string[]>([]);

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
      const [routesResponse, stopsResponse] = await Promise.all([
        apiService.getAllRoutes(),
        apiService.getAllStops()
      ]);
      setRoutes(routesResponse.routes || []);
      setAllStops(stopsResponse.stops || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateTotalDistance = (stops: Stop[]): number => {
    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const curr = stops[i];
      total += calculateDistance(
        prev.location.latitude,
        prev.location.longitude,
        curr.location.latitude,
        curr.location.longitude
      );
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedStops.length < 2) {
      setError('Please select at least 2 stops for the route');
      return;
    }

    try {
      const routeData = {
        name: formData.name,
        description: formData.description,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        departureTime: formData.departureTime,
        reachingTime: formData.reachingTime,
        stops: selectedStops
      };

      if (editingRoute) {
        // Update existing route
        const response = await fetch(`/api/routes/${editingRoute.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(routeData)
        });

        if (!response.ok) throw new Error('Failed to update route');
        setSuccess('Route updated successfully!');
      } else {
        // Create new route
        const response = await fetch('/api/routes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(routeData)
        });

        if (!response.ok) throw new Error('Failed to create route');
        setSuccess('Route created successfully!');
      }

      // Reset form
      setFormData({ 
        name: '', 
        description: '',
        fromLocation: '',
        toLocation: '',
        departureTime: '',
        reachingTime: ''
      });
      setSelectedStops([]);
      setShowAddForm(false);
      setEditingRoute(null);
      loadData();
    } catch (err: any) {
      console.error('Error saving route:', err);
      setError(err.message || 'Failed to save route');
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description,
      fromLocation: route.fromLocation || '',
      toLocation: route.toLocation || '',
      departureTime: route.departureTime || '',
      reachingTime: route.reachingTime || ''
    });
    setSelectedStops(route.stops.map(s => s.id));
    setShowAddForm(true);
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/routes/${routeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete route');
      setSuccess('Route deleted successfully!');
      loadData();
    } catch (err) {
      setError('Failed to delete route');
    }
  };

  const toggleStop = (stopId: string) => {
    if (selectedStops.includes(stopId)) {
      setSelectedStops(selectedStops.filter(id => id !== stopId));
    } else {
      setSelectedStops([...selectedStops, stopId]);
    }
  };

  const moveStopUp = (index: number) => {
    if (index === 0) return;
    const newStops = [...selectedStops];
    [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
    setSelectedStops(newStops);
  };

  const moveStopDown = (index: number) => {
    if (index === selectedStops.length - 1) return;
    const newStops = [...selectedStops];
    [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
    setSelectedStops(newStops);
  };

  const getSelectedStopsWithDetails = (): Stop[] => {
    return selectedStops
      .map(id => allStops.find(s => s.id === id))
      .filter(s => s !== undefined) as Stop[];
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛣️</div>
        <p>Loading routes...</p>
      </div>
    );
  }

  const selectedStopsDetails = getSelectedStopsWithDetails();
  const estimatedDistance = selectedStopsDetails.length >= 2 
    ? calculateTotalDistance(selectedStopsDetails) 
    : 0;

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
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🛣️ Routes Management</h1>
            <p style={{ margin: 0, color: '#666' }}>
              Create and manage bus routes
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingRoute(null);
              setFormData({ 
                name: '', 
                description: '',
                fromLocation: '',
                toLocation: '',
                departureTime: '',
                reachingTime: ''
              });
              setSelectedStops([]);
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
            + Add New Route
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
            {editingRoute ? 'Edit Route' : 'Add New Route'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Route Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., City Center Loop"
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
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Main route through city center"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Route Details Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px', 
              marginBottom: '20px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  From Location *
                </label>
                <input
                  type="text"
                  value={formData.fromLocation}
                  onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                  required
                  placeholder="e.g., Central Station"
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Departure Time *
                </label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  required
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  To Location *
                </label>
                <input
                  type="text"
                  value={formData.toLocation}
                  onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                  required
                  placeholder="e.g., Airport Terminal"
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
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Reaching Time *
                </label>
                <input
                  type="time"
                  value={formData.reachingTime}
                  onChange={(e) => setFormData({ ...formData, reachingTime: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Stop Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Select Stops (minimum 2) *
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Available Stops */}
                <div>
                  <h4 style={{ marginTop: 0, fontSize: '14px', color: '#666' }}>Available Stops</h4>
                  <div style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: '#f8f9fa'
                  }}>
                    {allStops.filter(stop => !selectedStops.includes(stop.id)).map(stop => (
                      <div
                        key={stop.id}
                        onClick={() => toggleStop(stop.id)}
                        style={{
                          padding: '10px',
                          marginBottom: '5px',
                          background: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#e7f3ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>🚏 {stop.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                        </div>
                      </div>
                    ))}
                    {allStops.filter(stop => !selectedStops.includes(stop.id)).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        All stops selected
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Stops (Ordered) */}
                <div>
                  <h4 style={{ marginTop: 0, fontSize: '14px', color: '#666' }}>
                    Selected Stops ({selectedStops.length}) - Order Matters
                  </h4>
                  <div style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: '#f8f9fa'
                  }}>
                    {selectedStopsDetails.map((stop, index) => (
                      <div
                        key={stop.id}
                        style={{
                          padding: '10px',
                          marginBottom: '5px',
                          background: 'white',
                          border: '1px solid #007bff',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: index === 0 ? '#007bff' : index === selectedStopsDetails.length - 1 ? '#28a745' : '#6c757d',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{stop.name}</div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button
                            type="button"
                            onClick={() => moveStopUp(index)}
                            disabled={index === 0}
                            style={{
                              padding: '2px 8px',
                              background: index === 0 ? '#e0e0e0' : '#007bff',
                              color: index === 0 ? '#999' : 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStopDown(index)}
                            disabled={index === selectedStopsDetails.length - 1}
                            style={{
                              padding: '2px 8px',
                              background: index === selectedStopsDetails.length - 1 ? '#e0e0e0' : '#007bff',
                              color: index === selectedStopsDetails.length - 1 ? '#999' : 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: index === selectedStopsDetails.length - 1 ? 'not-allowed' : 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            ▼
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleStop(stop.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {selectedStops.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        Click stops from the left to add them
                      </div>
                    )}
                  </div>
                  
                  {/* Distance Info */}
                  {selectedStopsDetails.length >= 2 && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      background: '#e7f3ff',
                      border: '1px solid #b3d9ff',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      <strong>Estimated Distance:</strong> {estimatedDistance.toFixed(2)} km
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={selectedStops.length < 2}
                style={{
                  padding: '12px 24px',
                  background: selectedStops.length < 2 ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedStops.length < 2 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {editingRoute ? 'Update Route' : 'Create Route'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingRoute(null);
                  setError('');
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

      {/* Routes List */}
      <div>
        <h2>All Routes ({routes.length})</h2>
        
        {routes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛣️</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Routes Yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Create your first route to get started
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
              Add First Route
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {routes.map(route => (
              <div
                key={route.id}
                style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>
                      🛣️ {route.name}
                    </h3>
                    <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                      {route.description}
                    </p>
                    
                    {/* Route Details */}
                    {route.fromLocation && route.toLocation && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '10px',
                        padding: '10px',
                        background: '#e7f3ff',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontWeight: 'bold' }}>📍 From:</span>
                          <span>{route.fromLocation}</span>
                          {route.departureTime && (
                            <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                              ({route.departureTime})
                            </span>
                          )}
                        </div>
                        <span style={{ color: '#999' }}>→</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontWeight: 'bold' }}>📍 To:</span>
                          <span>{route.toLocation}</span>
                          {route.reachingTime && (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                              ({route.reachingTime})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <strong>Stops:</strong> {route.stops?.length || 0} | 
                      <strong> Distance:</strong> {route.totalDistance?.toFixed(2) || '0.00'} km
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => navigate(`/routes/${route.id}`)}
                      style={{
                        padding: '8px 16px',
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(route)}
                      style={{
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(route.id)}
                      style={{
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

                {/* Stops Timeline */}
                {route.stops && route.stops.length > 0 && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {route.stops.map((stop, index) => (
                        <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            padding: '6px 12px',
                            background: index === 0 ? '#007bff' : index === route.stops.length - 1 ? '#28a745' : '#f8f9fa',
                            color: index === 0 || index === route.stops.length - 1 ? 'white' : '#333',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            border: '1px solid #ddd'
                          }}>
                            {index + 1}. {stop.name}
                          </div>
                          {index < route.stops.length - 1 && (
                            <span style={{ color: '#999' }}>→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
