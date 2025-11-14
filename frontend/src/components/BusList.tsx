import { useState, useEffect } from 'react';

interface BusLocation {
  busId: string;
  routeId?: string;
  routeName?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  timestamp: string;
  eta?: number;
  distance?: number;
  status?: 'active' | 'idle' | 'offline';
  delay?: number;
}

interface BusListProps {
  buses: BusLocation[];
  onBusClick?: (bus: BusLocation) => void;
  showRoute?: boolean;
  sortBy?: 'eta' | 'distance' | 'status' | 'time';
}

export default function BusList({ 
  buses, 
  onBusClick, 
  showRoute = true,
  sortBy = 'eta' 
}: BusListProps) {
  const [sortedBuses, setSortedBuses] = useState<BusLocation[]>([]);
  const [currentSort, setCurrentSort] = useState(sortBy);

  useEffect(() => {
    sortBuses(currentSort);
  }, [buses, currentSort]);

  const sortBuses = (criteria: string) => {
    const sorted = [...buses].sort((a, b) => {
      switch (criteria) {
        case 'eta':
          if (a.eta === undefined) return 1;
          if (b.eta === undefined) return -1;
          return a.eta - b.eta;
        
        case 'distance':
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        
        case 'status':
          const statusOrder = { active: 0, idle: 1, offline: 2 };
          return statusOrder[a.status || 'offline'] - statusOrder[b.status || 'offline'];
        
        case 'time':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        
        default:
          return 0;
      }
    });
    setSortedBuses(sorted);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'idle': return '#ffc107';
      case 'offline': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'idle': return 'Idle';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const formatETA = (eta?: number) => {
    if (eta === undefined) return 'N/A';
    if (eta < 1) return '< 1 min';
    if (eta < 60) return `${Math.round(eta)} min`;
    const hours = Math.floor(eta / 60);
    const mins = Math.round(eta % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (distance?: number) => {
    if (distance === undefined) return 'N/A';
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(1)} km`;
  };

  const getTimeSinceUpdate = (timestamp: string) => {
    const now = new Date().getTime();
    const updateTime = new Date(timestamp).getTime();
    const diffSeconds = Math.floor((now - updateTime) / 1000);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  if (buses.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚌</div>
        <h3 style={{ color: '#666', marginBottom: '10px' }}>No Buses Available</h3>
        <p style={{ color: '#999' }}>There are no active buses at the moment</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
          Sort by:
        </span>
        {[
          { value: 'eta', label: '⏱️ ETA' },
          { value: 'distance', label: '📏 Distance' },
          { value: 'status', label: '🚦 Status' },
          { value: 'time', label: '🕐 Last Update' }
        ].map(option => (
          <button
            key={option.value}
            onClick={() => setCurrentSort(option.value)}
            style={{
              padding: '8px 16px',
              background: currentSort === option.value ? '#007bff' : 'white',
              color: currentSort === option.value ? 'white' : '#666',
              border: '1px solid #ddd',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: currentSort === option.value ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Bus list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        {sortedBuses.map((bus) => (
          <div
            key={bus.busId}
            onClick={() => onBusClick && onBusClick(bus)}
            style={{
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '20px',
              cursor: onBusClick ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              if (onBusClick) {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (onBusClick) {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Left side - Bus info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: getStatusColor(bus.status),
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginRight: '15px'
                  }}>
                    🚌
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
                      Bus {bus.busId.slice(0, 8)}
                    </div>
                    {showRoute && bus.routeName && (
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        🛣️ {bus.routeName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bus details grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '10px',
                  marginTop: '15px'
                }}>
                  {bus.eta !== undefined && (
                    <div style={{
                      background: '#e7f3ff',
                      padding: '10px',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#0066cc', marginBottom: '4px' }}>
                        ETA
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc' }}>
                        {formatETA(bus.eta)}
                      </div>
                    </div>
                  )}

                  {bus.distance !== undefined && (
                    <div style={{
                      background: '#e7f9f0',
                      padding: '10px',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#00994d', marginBottom: '4px' }}>
                        Distance
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00994d' }}>
                        {formatDistance(bus.distance)}
                      </div>
                    </div>
                  )}

                  {bus.speed !== undefined && (
                    <div style={{
                      background: '#fff3e0',
                      padding: '10px',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '4px' }}>
                        Speed
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#e65100' }}>
                        {Math.round(bus.speed)} km/h
                      </div>
                    </div>
                  )}

                  {bus.heading !== undefined && (
                    <div style={{
                      background: '#f3e5f5',
                      padding: '10px',
                      borderRadius: '6px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#6a1b9a', marginBottom: '4px' }}>
                        Heading
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6a1b9a' }}>
                        {Math.round(bus.heading)}°
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Status and delay */}
              <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: `${getStatusColor(bus.status)}20`,
                  color: getStatusColor(bus.status),
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(bus.status)
                  }} />
                  {getStatusLabel(bus.status)}
                </div>

                {bus.delay !== undefined && bus.delay > 0 && (
                  <div style={{
                    background: '#fff3cd',
                    color: '#856404',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}>
                    ⚠️ {Math.round(bus.delay)} min delay
                  </div>
                )}

                <div style={{
                  fontSize: '12px',
                  color: '#999',
                  marginTop: '10px'
                }}>
                  Updated: {getTimeSinceUpdate(bus.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
