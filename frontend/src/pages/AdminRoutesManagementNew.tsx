import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Bus {
  id: string;
  busNumber: string;
  registrationNumber: string;
}

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface Route {
  id: string;
  name: string;
  busId: string;
  busNumber: string;
  fromLocation: string;
  departureTime: string;
  toLocation: string;
  reachingTime: string;
  stops: Stop[];
}

export default function AdminRoutesManagementNew() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    busId: '',
    fromLocation: '',
    departureTime: '',
    toLocation: '',
    reachingTime: '',
    driverEmails: [] as string[]
  });

  // Driver email input
  const [driverEmailInput, setDriverEmailInput] = useState('');
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [busSearch, setBusSearch] = useState('');
  const [stopSearch, setStopSearch] = useState('');

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
  }, []); // Empty dependency array - only run once on mount

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesRes, busesRes, stopsRes] = await Promise.all([
        fetch('/api/routes', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json()),
        fetch('/api/buses', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json()),
        fetch('/api/stops', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json())
      ]);
      
      setRoutes(routesRes.routes || []);
      setBuses(busesRes.buses || []);
      setAllStops(stopsRes.stops || []);
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

    if (!formData.busId) {
      setError('Please select a bus');
      return;
    }

    if (selectedStops.length < 2) {
      setError('Please select at least 2 stops');
      return;
    }

    if (formData.driverEmails.length === 0) {
      setError('Please assign at least one driver');
      return;
    }

    try {
      // Format stops as expected by backend
      const stopsData = selectedStops.map(stopId => ({
        stopId: stopId,
        expectedDwellTime: 60,
        distanceFromPrevious: 0
      }));

      const url = editingRoute ? `/api/routes/${editingRoute.id}` : '/api/routes';
      const method = editingRoute ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: `Bus: ${selectedBus?.busNumber}`,
          busId: formData.busId,
          fromLocation: formData.fromLocation,
          toLocation: formData.toLocation,
          departureTime: formData.departureTime,
          reachingTime: formData.reachingTime,
          stops: stopsData,
          driverEmails: formData.driverEmails
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingRoute ? 'update' : 'create'} route`);
      }

      await response.json();
      
      setSuccess(`Route ${editingRoute ? 'updated' : 'created'} successfully!`);
      setFormData({
        name: '',
        busId: '',
        fromLocation: '',
        departureTime: '',
        toLocation: '',
        reachingTime: '',
        driverEmails: []
      });
      setDriverEmailInput('');
      setSelectedStops([]);
      setShowAddForm(false);
      setEditingRoute(null);
      loadData();
    } catch (err: any) {
      setError(err.message || `Failed to ${editingRoute ? 'update' : 'create'} route`);
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

  const handleEdit = async (route: Route) => {
    setEditingRoute(route);
    
    // Load assigned drivers for this bus
    let assignedDriverEmails: string[] = [];
    if (route.busId) {
      try {
        const response = await fetch(`/api/routes/bus/${route.busId}/drivers`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        const data = await response.json();
        if (data.drivers) {
          assignedDriverEmails = data.drivers.map((d: any) => d.email);
        }
      } catch (err) {
        console.error('Failed to load assigned drivers:', err);
      }
    }
    
    setFormData({
      name: route.name,
      busId: route.busId || '',
      fromLocation: route.fromLocation,
      departureTime: route.departureTime,
      toLocation: route.toLocation,
      reachingTime: route.reachingTime,
      driverEmails: assignedDriverEmails
    });
    setDriverEmailInput('');
    setBusSearch(''); // Clear bus search to show selected bus
    setSelectedStops(route.stops.map(s => s.id));
    setShowAddForm(true);
    setError('');
    setSuccess('');
  };

  const addDriverEmail = () => {
    const email = driverEmailInput.trim();
    if (!email) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if already added
    if (formData.driverEmails.includes(email)) {
      setError('This driver email is already added');
      return;
    }

    setFormData({
      ...formData,
      driverEmails: [...formData.driverEmails, email]
    });
    setDriverEmailInput('');
    setError('');
  };

  const removeDriverEmail = (email: string) => {
    setFormData({
      ...formData,
      driverEmails: formData.driverEmails.filter(e => e !== email)
    });
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/routes/${routeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete route');
      }

      setSuccess('Route deleted successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete route');
    }
  };

  const filteredBuses = buses.filter(bus =>
    bus.busNumber.toLowerCase().includes(busSearch.toLowerCase()) ||
    bus.registrationNumber.toLowerCase().includes(busSearch.toLowerCase())
  );

  const filteredStops = allStops.filter(stop =>
    !selectedStops.includes(stop.id) &&
    stop.name.toLowerCase().includes(stopSearch.toLowerCase())
  );

  const selectedBus = buses.find(b => b.id === formData.busId);
  const selectedStopsDetails = selectedStops
    .map(id => allStops.find(s => s.id === id))
    .filter(s => s !== undefined) as Stop[];

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛣️</div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
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
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🛣️ Routes Management</h1>
            <p style={{ margin: 0, color: '#666' }}>
              Create routes by selecting bus, locations, times, and stops
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingRoute(null);
              setFormData({
                name: '',
                busId: '',
                fromLocation: '',
                departureTime: '',
                toLocation: '',
                reachingTime: '',
                driverEmails: []
              });
              setDriverEmailInput('');
              setBusSearch('');
              setSelectedStops([]);
              setError('');
              setSuccess('');
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

      {/* Add Route Form */}
      {showAddForm && (
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0 }}>{editingRoute ? 'Edit Route' : 'Add New Route'}</h2>
          
          <form onSubmit={handleSubmit}>
            {/* Step 1: Select Bus */}
            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '2px solid #007bff'
            }}>
              <h3 style={{ marginTop: 0, color: '#007bff' }}>Step 1: Select Bus</h3>
              
              <input
                type="text"
                placeholder="🔍 Search bus by number or registration..."
                value={busSearch}
                onChange={(e) => setBusSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '15px'
                }}
              />

              {selectedBus ? (
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
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#155724' }}>
                      ✅ {selectedBus.busNumber}
                    </div>
                    <div style={{ fontSize: '14px', color: '#155724' }}>
                      {selectedBus.registrationNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, busId: '' })}
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {filteredBuses.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                      No buses found. Please add buses first.
                    </div>
                  ) : (
                    filteredBuses.map(bus => (
                      <div
                        key={bus.id}
                        onClick={() => setFormData({ ...formData, busId: bus.id })}
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
                          🚌 {bus.busNumber}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {bus.registrationNumber}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Route Details */}
            {selectedBus && (
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '2px solid #28a745'
              }}>
                <h3 style={{ marginTop: 0, color: '#28a745' }}>Step 2: Route Details</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Route Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., City Express Route"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      📍 From Location *
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
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      ⏰ Departure Time *
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
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      📍 To Location *
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
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      ⏰ Reaching Time *
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

                {/* Driver Email Section */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    👥 Assign Drivers *
                  </label>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                    Enter driver email addresses to assign them to this bus (at least one required)
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="email"
                      value={driverEmailInput}
                      onChange={(e) => setDriverEmailInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDriverEmail();
                        }
                      }}
                      placeholder="Enter driver email (e.g., driver@example.com)"
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={addDriverEmail}
                      style={{
                        padding: '10px 20px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      + Add
                    </button>
                  </div>

                  {/* List of added driver emails */}
                  {formData.driverEmails.length > 0 && (
                    <div style={{
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '10px'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
                        Added Drivers ({formData.driverEmails.length}):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formData.driverEmails.map((email, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: '#e7f3ff',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          >
                            <span>📧 {email}</span>
                            <button
                              type="button"
                              onClick={() => removeDriverEmail(email)}
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
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Select Stops */}
            {selectedBus && formData.name && formData.fromLocation && (
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '2px solid #ffc107'
              }}>
                <h3 style={{ marginTop: 0, color: '#856404' }}>Step 3: Select Stops (minimum 2)</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Available Stops */}
                  <div>
                    <h4 style={{ marginTop: 0, fontSize: '14px', color: '#666' }}>Available Stops</h4>
                    
                    <input
                      type="text"
                      placeholder="🔍 Search stops..."
                      value={stopSearch}
                      onChange={(e) => setStopSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        marginBottom: '10px'
                      }}
                    />
                    
                    {stopSearch && (
                      <div style={{
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '10px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        background: 'white'
                      }}>
                        {filteredStops.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                            No stops found
                          </div>
                        ) : (
                          filteredStops.map(stop => (
                            <div
                              key={stop.id}
                              onClick={() => {
                                toggleStop(stop.id);
                                setStopSearch('');
                              }}
                              style={{
                                padding: '10px',
                                marginBottom: '5px',
                                background: '#f8f9fa',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#e7f3ff'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                            >
                              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>🚏 {stop.name}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Stops */}
                  <div>
                    <h4 style={{ marginTop: 0, fontSize: '14px', color: '#666' }}>
                      Selected Stops ({selectedStops.length})
                    </h4>
                    <div style={{
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '10px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      background: 'white'
                    }}>
                      {selectedStopsDetails.map((stop, index) => (
                        <div
                          key={stop.id}
                          style={{
                            padding: '10px',
                            marginBottom: '5px',
                            background: '#e7f3ff',
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
                            background: '#007bff',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {index + 1}
                          </div>
                          <div style={{ flex: 1, fontWeight: 'bold', fontSize: '14px' }}>
                            {stop.name}
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
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingRoute(null);
                  setFormData({
                    name: '',
                    busId: '',
                    fromLocation: '',
                    departureTime: '',
                    toLocation: '',
                    reachingTime: '',
                    driverEmails: []
                  });
                  setSelectedStops([]);
                  setError('');
                  setSuccess('');
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
              
              <button
                type="submit"
                disabled={!selectedBus || selectedStops.length < 2}
                style={{
                  padding: '12px 24px',
                  background: !selectedBus || selectedStops.length < 2 ? '#ccc' : editingRoute ? '#007bff' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !selectedBus || selectedStops.length < 2 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {editingRoute ? '💾 Update Route' : '✅ Create Route'}
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
              Add buses first, then create your first route
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>🛣️ {route.name}</h3>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      🚌 Bus: <strong>{route.busNumber}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px',
                      background: '#e7f3ff',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      <span>📍 {route.fromLocation}</span>
                      <span style={{ color: '#007bff', fontWeight: 'bold' }}>({route.departureTime})</span>
                      <span>→</span>
                      <span>📍 {route.toLocation}</span>
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>({route.reachingTime})</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <button
                      onClick={() => handleEdit(route)}
                      style={{
                        padding: '8px 16px',
                        background: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✏️ Edit
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
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Stops */}
                {route.stops && route.stops.length > 0 && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                      Stops ({route.stops.length}):
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {route.stops.map((stop, index) => (
                        <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            padding: '6px 12px',
                            background: '#f8f9fa',
                            borderRadius: '20px',
                            fontSize: '13px',
                            border: '1px solid #ddd'
                          }}>
                            {index + 1}. {stop.name}
                          </div>
                          {index < route.stops.length - 1 && <span style={{ color: '#999' }}>→</span>}
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

