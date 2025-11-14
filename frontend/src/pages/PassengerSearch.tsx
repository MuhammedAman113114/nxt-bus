import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  toLocation: string;
  departureTime: string;
  reachingTime: string;
  stops: Stop[];
}

interface ETAData {
  routeId: string;
  routeName: string;
  busNumber: string;
  driverName: string;
  etaLocal: string;
  inMinutes: number;
  travelSeconds: number;
  source: string;
  message: string;
}

export default function PassengerSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [etaData, setEtaData] = useState<Record<string, ETAData>>({});
  const [loadingETA, setLoadingETA] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  // Separate effect to handle URL parameters after data is loaded
  useEffect(() => {
    if (allRoutes.length === 0) return; // Wait for data to load
    
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (from) {
      const decodedFrom = decodeURIComponent(from);
      const decodedTo = to ? decodeURIComponent(to) : '';
      
      // Set the input values
      setFromLocation(decodedFrom);
      if (decodedTo) {
        setToLocation(decodedTo);
      }
      
      // Auto-search when URL has parameters
      setHasSearched(true);
      performSearch(decodedFrom, decodedTo, allRoutes);
    }
  }, [allRoutes, searchParams]); // Run when allRoutes or searchParams changes
  
  const performSearch = (searchFrom: string, searchTo: string, routesToSearch = allRoutes) => {
    if (!searchFrom) {
      setError('Please enter a From location');
      return;
    }

    if (routesToSearch.length === 0) {
      console.log('No routes loaded yet');
      setError('Loading routes... Please try again.');
      return;
    }

    setError('');
    
    // Normalize search terms
    const searchFromLower = searchFrom.toLowerCase().trim();
    const searchToLower = searchTo ? searchTo.toLowerCase().trim() : '';
    
    console.log('=== SEARCH DEBUG ===');
    console.log('Searching for:', { from: searchFromLower, to: searchToLower || 'ANY' });
    console.log('Total routes:', routesToSearch.length);
    
    // Filter routes based on from and optionally to locations
    const results = routesToSearch.filter(route => {
      // Check if stops array exists
      const stops = route.stops || [];
      
      console.log(`\nChecking route: ${route.name}`);
      console.log('  From:', route.fromLocation);
      console.log('  To:', route.toLocation);
      console.log('  Stops:', stops.map(s => s.name).join(', '));
      
      // Check if 'from' matches route start or any stop
      const fromMatchesRouteStart = route.fromLocation?.toLowerCase().trim().includes(searchFromLower);
      const fromStopIndex = stops.findIndex(stop => 
        stop.name?.toLowerCase().trim().includes(searchFromLower)
      );
      const fromMatch = fromMatchesRouteStart || fromStopIndex !== -1;
      
      console.log('  From match:', { fromMatchesRouteStart, fromStopIndex, fromMatch });
      
      // If from doesn't match, reject immediately
      if (!fromMatch) {
        console.log('  ❌ REJECTED: From doesn\'t match');
        return false;
      }
      
      // If no 'to' location specified, accept any route that matches 'from'
      if (!searchToLower) {
        console.log('  ✅ VALID: From matches and no To specified');
        return true;
      }
      
      // Check if 'to' matches route end or any stop
      const toMatchesRouteEnd = route.toLocation?.toLowerCase().trim().includes(searchToLower);
      const toStopIndex = stops.findIndex(stop => 
        stop.name?.toLowerCase().trim().includes(searchToLower)
      );
      const toMatch = toMatchesRouteEnd || toStopIndex !== -1;
      
      console.log('  To match:', { toMatchesRouteEnd, toStopIndex, toMatch });
      
      // If 'to' doesn't match, reject
      if (!toMatch) {
        console.log('  ❌ REJECTED: To doesn\'t match');
        return false;
      }
      
      // Now check if the direction makes sense
      
      // Case 1: Both are stops - check order
      if (fromStopIndex !== -1 && toStopIndex !== -1) {
        const valid = fromStopIndex < toStopIndex;
        console.log(`  Case 1: Both stops - ${valid ? '✅ VALID' : '❌ INVALID'} (order: ${fromStopIndex} < ${toStopIndex})`);
        return valid;
      }
      
      // Case 2: From is route start, to is a stop
      if (fromMatchesRouteStart && toStopIndex !== -1) {
        console.log('  Case 2: Start to stop - ✅ VALID');
        return true;
      }
      
      // Case 3: From is a stop, to is route end
      if (fromStopIndex !== -1 && toMatchesRouteEnd) {
        console.log('  Case 3: Stop to end - ✅ VALID');
        return true;
      }
      
      // Case 4: From is route start, to is route end
      if (fromMatchesRouteStart && toMatchesRouteEnd) {
        console.log('  Case 4: Start to end - ✅ VALID');
        return true;
      }
      
      // If both match but none of the cases above, allow it
      console.log('  Edge case - allowing match');
      return true;
    });

    console.log('\n=== SEARCH COMPLETE ===');
    console.log('Matched routes:', results.length);
    console.log('Routes:', results.map(r => r.name).join(', '));

    setFilteredRoutes(results);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [stopsRes, routesRes] = await Promise.all([
        fetch('/api/stops').then(r => r.json()),
        fetch('/api/routes').then(r => r.json())
      ]);
      
      console.log('Loaded stops:', stopsRes.stops?.length || 0);
      console.log('Loaded routes:', routesRes.routes?.length || 0);
      console.log('Routes data:', routesRes.routes);
      
      setAllStops(stopsRes.stops || []);
      setAllRoutes(routesRes.routes || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (from?: string, to?: string) => {
    const searchFrom = String(from || fromLocation || '').trim();
    const searchTo = String(to || toLocation || '').trim();
    
    if (!searchFrom) {
      setError('Please enter a From location');
      return;
    }
    
    // Mark that a search has been performed
    setHasSearched(true);
    
    // Update URL parameters
    const params: Record<string, string> = {
      from: encodeURIComponent(searchFrom)
    };
    if (searchTo) {
      params.to = encodeURIComponent(searchTo);
    }
    setSearchParams(params);
    
    performSearch(searchFrom, searchTo);
  };

  const getFromSuggestions = () => {
    if (!fromLocation) return [];
    
    const locationSet = new Set<string>();
    
    // Add route from locations
    allRoutes.forEach(route => {
      if (route.fromLocation.toLowerCase().includes(fromLocation.toLowerCase())) {
        locationSet.add(route.fromLocation);
      }
    });
    
    // Add stops
    allStops.forEach(stop => {
      if (stop.name.toLowerCase().includes(fromLocation.toLowerCase())) {
        locationSet.add(stop.name);
      }
    });
    
    return Array.from(locationSet).slice(0, 5);
  };

  const getToSuggestions = () => {
    if (!toLocation) return [];
    
    const locationSet = new Set<string>();
    
    // Add route to locations
    allRoutes.forEach(route => {
      if (route.toLocation.toLowerCase().includes(toLocation.toLowerCase())) {
        locationSet.add(route.toLocation);
      }
    });
    
    // Add stops
    allStops.forEach(stop => {
      if (stop.name.toLowerCase().includes(toLocation.toLowerCase())) {
        locationSet.add(stop.name);
      }
    });
    
    return Array.from(locationSet).slice(0, 5);
  };

  const calculateDuration = (departureTime: string, reachingTime: string) => {
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [reachHour, reachMin] = reachingTime.split(':').map(Number);
    
    let durationMinutes = (reachHour * 60 + reachMin) - (depHour * 60 + depMin);
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight routes
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getRealTimeETA = async (route: Route) => {
    try {
      setLoadingETA(prev => ({ ...prev, [route.id]: true }));
      
      // Get user's current location
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                routeId: route.id,
                userLat: position.coords.latitude,
                userLon: position.coords.longitude,
                scheduledFrom: route.departureTime,
                scheduledTo: route.reachingTime,
                timeZone: 'Asia/Kolkata'
              })
            });

            if (response.ok) {
              const eta = await response.json();
              setEtaData(prev => ({ ...prev, [route.id]: eta }));
            } else {
              const error = await response.json();
              alert(error.message || 'Failed to get ETA');
            }
          } catch (err) {
            console.error('Error fetching ETA:', err);
            alert('Failed to get real-time ETA');
          } finally {
            setLoadingETA(prev => ({ ...prev, [route.id]: false }));
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Please enable location access to get real-time ETA');
          setLoadingETA(prev => ({ ...prev, [route.id]: false }));
        }
      );
    } catch (err) {
      console.error('Error:', err);
      setLoadingETA(prev => ({ ...prev, [route.id]: false }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#667eea', fontSize: '28px' }}>🚌 NXT Bus</h1>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Login
          </button>
        </div>
      </div>

      {/* Search Section */}
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '30px', textAlign: 'center', color: '#333' }}>
            Find Your Bus
          </h2>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Debug info */}
          {!loading && allRoutes.length === 0 && (
            <div style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              ⚠️ No routes loaded. Please refresh the page.
            </div>
          )}

          {!loading && allRoutes.length > 0 && (
            <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '8px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '12px'
            }}>
              ✅ {allRoutes.length} route{allRoutes.length !== 1 ? 's' : ''} loaded
            </div>
          )}

          {/* Horizontal Search Form */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* From Location */}
            <div style={{ flex: '1 1 250px', position: 'relative', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                📍 From
              </label>
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => {
                  setFromLocation(e.target.value);
                  setShowFromSuggestions(true);
                  // Clear results and error when input changes
                  setError('');
                  if (hasSearched) {
                    setHasSearched(false);
                    setFilteredRoutes([]);
                  }
                }}
                onFocus={() => setShowFromSuggestions(true)}
                onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                placeholder="Starting location"
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* From Suggestions */}
              {showFromSuggestions && fromLocation && getFromSuggestions().length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '5px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {getFromSuggestions().map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setFromLocation(suggestion);
                        setShowFromSuggestions(false);
                      }}
                      style={{
                        padding: '12px 15px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      📍 {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* To Location */}
            <div style={{ flex: '1 1 250px', position: 'relative', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                📍 To <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#999' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={toLocation}
                onChange={(e) => {
                  setToLocation(e.target.value);
                  setShowToSuggestions(true);
                  // Clear results and error when input changes
                  setError('');
                  if (hasSearched) {
                    setHasSearched(false);
                    setFilteredRoutes([]);
                  }
                }}
                onFocus={() => setShowToSuggestions(true)}
                onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                placeholder="Destination (optional)"
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* To Suggestions */}
              {showToSuggestions && toLocation && getToSuggestions().length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '5px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {getToSuggestions().map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setToLocation(suggestion);
                        setShowToSuggestions(false);
                      }}
                      style={{
                        padding: '12px 15px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      📍 {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <button
              onClick={() => {
                console.log('Search button clicked');
                console.log('From:', fromLocation);
                console.log('To:', toLocation);
                console.log('All routes loaded:', allRoutes.length);
                handleSearch();
              }}
              disabled={loading}
              style={{
                flex: '0 0 auto',
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                whiteSpace: 'nowrap',
                minWidth: '150px'
              }}
            >
              {loading ? 'Loading...' : '🔍 Search Buses'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && filteredRoutes.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '24px' }}>
              Found {filteredRoutes.length} Route{filteredRoutes.length !== 1 ? 's' : ''}
            </h3>
            
            {filteredRoutes.map(route => (
              <div
                key={route.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '25px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }}
              >
                {/* Route Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                      🚍 {route.name}
                    </h4>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                      Bus: {route.busNumber}
                    </div>
                  </div>
                  <div style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {calculateDuration(route.departureTime, route.reachingTime)}
                  </div>
                </div>

                {/* Route Details */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>From</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                      {route.fromLocation}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667eea', marginTop: '3px' }}>
                      {route.departureTime}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '24px' }}>→</div>
                  
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>To</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                      {route.toLocation}
                    </div>
                    <div style={{ fontSize: '14px', color: '#667eea', marginTop: '3px' }}>
                      {route.reachingTime}
                    </div>
                  </div>
                </div>

                {/* Stops */}
                {route.stops && route.stops.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 'bold' }}>
                      Stops ({route.stops.length}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {route.stops.slice(0, 5).map((stop, index) => (
                        <span
                          key={stop.id}
                          style={{
                            background: '#e7f3ff',
                            color: '#0066cc',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '13px'
                          }}
                        >
                          {stop.name}
                        </span>
                      ))}
                      {route.stops.length > 5 && (
                        <span style={{
                          color: '#666',
                          padding: '4px 12px',
                          fontSize: '13px'
                        }}>
                          +{route.stops.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Real-Time ETA Section */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  {!etaData[route.id] ? (
                    <button
                      onClick={() => getRealTimeETA(route)}
                      disabled={loadingETA[route.id]}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: loadingETA[route.id] ? '#ccc' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: loadingETA[route.id] ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      {loadingETA[route.id] ? '⏳ Getting Real-Time ETA...' : '🕐 Get Real-Time ETA'}
                    </button>
                  ) : (
                    <div style={{
                      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '2px solid #4caf50'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '14px', color: '#2e7d32', fontWeight: 'bold' }}>
                          🚌 Real-Time ETA
                        </div>
                        <button
                          onClick={() => getRealTimeETA(route)}
                          disabled={loadingETA[route.id]}
                          style={{
                            padding: '4px 12px',
                            background: 'white',
                            color: '#4caf50',
                            border: '1px solid #4caf50',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Refresh
                        </button>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b5e20', marginBottom: '8px' }}>
                        Arrives in {etaData[route.id].inMinutes} minutes
                      </div>
                      <div style={{ fontSize: '16px', color: '#2e7d32', marginBottom: '5px' }}>
                        ETA: {etaData[route.id].etaLocal}
                      </div>
                      <div style={{ fontSize: '13px', color: '#558b2f' }}>
                        Bus: {etaData[route.id].busNumber} • Source: {etaData[route.id].source}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {hasSearched && filteredRoutes.length === 0 && !loading && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            marginTop: '30px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
            <h3 style={{ margin: 0, marginBottom: '10px', color: '#333' }}>No Routes Found</h3>
            <p style={{ margin: 0, color: '#666' }}>
              Try searching with different locations or stops
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
