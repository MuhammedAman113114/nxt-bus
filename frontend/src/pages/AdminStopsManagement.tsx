import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

interface Stop {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  qrCode: string;
  createdAt: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export default function AdminStopsManagement() {
  const navigate = useNavigate();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [user, setUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: ''
  });

  // Nominatim search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<NominatimResult | null>(null);

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
      
      loadStops();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadStops = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stops', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setStops(data.stops || []);
    } catch (err: any) {
      console.error('Error loading stops:', err);
      setError('Failed to load stops');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (stopId: string) => {
    try {
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(stopId, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrDataUrl;
    } catch (err) {
      console.error('Error generating QR code:', err);
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Invalid latitude. Must be between -90 and 90');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Invalid longitude. Must be between -180 and 180');
      return;
    }

    try {
      if (editingStop) {
        // Update existing stop
        const response = await fetch(`/api/stops/${editingStop.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            name: formData.name,
            latitude: lat,
            longitude: lng
          })
        });

        if (!response.ok) throw new Error('Failed to update stop');
        setSuccess('Stop updated successfully!');
      } else {
        // Add new stop
        const response = await fetch('/api/stops', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            name: formData.name,
            latitude: lat,
            longitude: lng
          })
        });

        if (!response.ok) throw new Error('Failed to create stop');
        setSuccess('Stop created successfully with QR code!');
      }

      // Reset form
      setFormData({ name: '', latitude: '', longitude: '' });
      setShowAddForm(false);
      setEditingStop(null);
      loadStops();
    } catch (err: any) {
      console.error('Error saving stop:', err);
      setError(err.message || 'Failed to save stop');
    }
  };

  const handleEdit = (stop: Stop) => {
    setEditingStop(stop);
    setSelectedPlace(null);
    setSearchQuery('');
    setSearchResults([]);
    setFormData({
      name: stop.name,
      latitude: stop.location.latitude.toString(),
      longitude: stop.location.longitude.toString(),
      address: ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (stopId: string) => {
    if (!confirm('Are you sure you want to delete this stop? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/stops/${stopId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete stop');
      setSuccess('Stop deleted successfully!');
      loadStops();
    } catch (err) {
      setError('Failed to delete stop');
    }
  };

  const handleViewQR = async (stop: Stop) => {
    const qrUrl = await generateQRCode(stop.id);
    setQrCodeUrl(qrUrl);
  };

  const handleDownloadQR = async (stop: Stop) => {
    const qrUrl = await generateQRCode(stop.id);
    
    // Create download link
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${stop.name.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess(`QR code downloaded for ${stop.name}`);
  };

  const handlePrintQR = async (stop: Stop) => {
    const qrUrl = await generateQRCode(stop.id);
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${stop.name}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
                padding: 40px;
                border: 2px solid #000;
              }
              h1 { margin: 0 0 20px 0; }
              img { margin: 20px 0; }
              .info { margin-top: 20px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚏 ${stop.name}</h1>
              <img src="${qrUrl}" alt="QR Code" />
              <div class="info">
                <p>Scan this QR code to view bus arrivals</p>
                <p>Stop ID: ${stop.id.slice(0, 8)}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Search places using Nominatim
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=in`,
        {
          headers: {
            'User-Agent': 'NxtBusApp/1.0' // Required by Nominatim usage policy
          }
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search locations. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input with debounce
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSelectedPlace(null);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchPlaces(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Select a place from search results
  const selectPlace = (place: NominatimResult) => {
    setSelectedPlace(place);
    setSearchQuery('');
    setSearchResults([]);
    
    // Extract a clean name from the address
    const name = place.address.road || place.address.suburb || place.display_name.split(',')[0];
    
    setFormData({
      name: name,
      latitude: place.lat,
      longitude: place.lon,
      address: place.display_name
    });
  };

  // Clear selected place
  const clearSelection = () => {
    setSelectedPlace(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      address: ''
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
          setSuccess('Location detected!');
        },
        (error) => {
          setError('Failed to get location: ' + error.message);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚏</div>
        <p>Loading stops...</p>
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
            <h1 style={{ margin: 0, marginBottom: '5px' }}>🚏 Bus Stops Management</h1>
            <p style={{ margin: 0, color: '#666' }}>
              Create and manage bus stops with QR codes
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingStop(null);
              setSelectedPlace(null);
              setSearchQuery('');
              setSearchResults([]);
              setFormData({ name: '', latitude: '', longitude: '', address: '' });
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
            + Add New Stop
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
            {editingStop ? 'Edit Stop' : 'Add New Stop'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            {/* Search Location */}
            {!selectedPlace && !editingStop && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  🔍 Search Location
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search for bus stop, station, or landmark..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #007bff',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                
                {searching && (
                  <div style={{ padding: '10px', color: '#666', fontSize: '14px' }}>
                    Searching...
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div style={{
                    marginTop: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: 'white',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {searchResults.map((result) => (
                      <div
                        key={result.place_id}
                        onClick={() => selectPlace(result)}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f8ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          📍 {result.display_name.split(',')[0]}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {result.display_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Place Confirmation */}
            {selectedPlace && (
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                background: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#155724' }}>
                      ✅ Selected Location
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <strong>Name:</strong> {formData.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      <strong>Address:</strong> {formData.address}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      <strong>Coordinates:</strong> {formData.latitude}, {formData.longitude}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    style={{
                      padding: '6px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Manual Entry or Edit Mode */}
            {(selectedPlace || editingStop) && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Stop Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              </>
            )}

            {(selectedPlace || editingStop) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Latitude *
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    required
                    placeholder="e.g., 12.9716"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: selectedPlace ? '#f8f9fa' : 'white'
                    }}
                    readOnly={!!selectedPlace}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Longitude *
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    required
                    placeholder="e.g., 77.5946"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: selectedPlace ? '#f8f9fa' : 'white'
                    }}
                    readOnly={!!selectedPlace}
                  />
                </div>

                {editingStop && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      &nbsp;
                    </label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      style={{
                        padding: '10px 16px',
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📍 Use My Location
                    </button>
                  </div>
                )}
              </div>
            )}

            {(selectedPlace || editingStop) && (
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
                  {editingStop ? '💾 Update Stop' : '✅ Create Stop'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStop(null);
                    setSelectedPlace(null);
                    setSearchQuery('');
                    setSearchResults([]);
                    setFormData({ name: '', latitude: '', longitude: '', address: '' });
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
            )}
          </form>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeUrl && (
        <div
          onClick={() => setQrCodeUrl('')}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '400px'
            }}
          >
            <h3 style={{ marginTop: 0 }}>QR Code</h3>
            <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', maxWidth: '300px' }} />
            <button
              onClick={() => setQrCodeUrl('')}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stops List */}
      <div>
        <h2>All Stops ({stops.length})</h2>
        
        {stops.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚏</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Stops Yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Create your first bus stop to get started
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
              Add First Stop
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {stops.map(stop => (
              <div
                key={stop.id}
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
                    🚏 {stop.name}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                    <strong>Coordinates:</strong><br />
                    {stop.location.latitude.toFixed(6)}, {stop.location.longitude.toFixed(6)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    QR Code: {stop.qrCode}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Created: {new Date(stop.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <button
                    onClick={() => handleViewQR(stop)}
                    style={{
                      flex: '1 1 auto',
                      padding: '8px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    View QR
                  </button>
                  
                  <button
                    onClick={() => handleDownloadQR(stop)}
                    style={{
                      flex: '1 1 auto',
                      padding: '8px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    Download
                  </button>
                  
                  <button
                    onClick={() => handlePrintQR(stop)}
                    style={{
                      flex: '1 1 auto',
                      padding: '8px 12px',
                      background: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    Print
                  </button>
                  
                  <button
                    onClick={() => handleEdit(stop)}
                    style={{
                      flex: '1 1 auto',
                      padding: '8px 12px',
                      background: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(stop.id)}
                    style={{
                      flex: '1 1 auto',
                      padding: '8px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
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
