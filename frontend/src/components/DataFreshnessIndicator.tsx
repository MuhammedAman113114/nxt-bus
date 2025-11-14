interface DataFreshnessIndicatorProps {
  fromCache?: boolean;
  stale?: boolean;
  lastUpdate?: Date;
  compact?: boolean;
}

export default function DataFreshnessIndicator({
  fromCache = false,
  stale = false,
  lastUpdate,
  compact = false
}: DataFreshnessIndicatorProps) {
  
  if (!fromCache && !stale) {
    return null; // Data is fresh from server
  }

  const getTimeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: stale ? '#dc3545' : '#6c757d',
          padding: '2px 6px',
          background: stale ? '#fff5f5' : '#f8f9fa',
          borderRadius: '10px',
          border: `1px solid ${stale ? '#ffcdd2' : '#e0e0e0'}`
        }}
      >
        <span>{stale ? '⚠️' : '💾'}</span>
        <span>{stale ? 'Offline' : 'Cached'}</span>
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: stale ? '#fff3cd' : '#e7f3ff',
        border: `1px solid ${stale ? '#ffc107' : '#b3d9ff'}`,
        borderRadius: '6px',
        fontSize: '13px',
        color: stale ? '#856404' : '#0066cc'
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {stale ? '⚠️' : '💾'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
          {stale ? 'Offline Mode' : 'Cached Data'}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          {stale 
            ? 'Showing last known data. Connect to internet for updates.'
            : lastUpdate 
              ? `Last updated ${getTimeSince(lastUpdate)}`
              : 'Data loaded from cache'
          }
        </div>
      </div>
    </div>
  );
}
