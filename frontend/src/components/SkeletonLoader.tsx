interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'list' | 'map';
  count?: number;
  height?: string;
}

export default function SkeletonLoader({ 
  type = 'card', 
  count = 1,
  height = '100px'
}: SkeletonLoaderProps) {
  
  const shimmer = `
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
  `;

  const skeletonStyle = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 2s infinite',
    borderRadius: '4px'
  };

  if (type === 'text') {
    return (
      <>
        <style>{shimmer}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              ...skeletonStyle,
              height: '16px',
              marginBottom: '8px',
              width: i === count - 1 ? '60%' : '100%'
            }}
          />
        ))}
      </>
    );
  }

  if (type === 'list') {
    return (
      <>
        <style>{shimmer}</style>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px'
            }}
          >
            <div style={{ display: 'flex', gap: '15px' }}>
              <div
                style={{
                  ...skeletonStyle,
                  width: '50px',
                  height: '50px',
                  borderRadius: '8px',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    ...skeletonStyle,
                    height: '20px',
                    width: '70%',
                    marginBottom: '10px'
                  }}
                />
                <div
                  style={{
                    ...skeletonStyle,
                    height: '16px',
                    width: '50%'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'map') {
    return (
      <>
        <style>{shimmer}</style>
        <div
          style={{
            ...skeletonStyle,
            height,
            width: '100%',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '15px'
          }}
        >
          <div style={{ fontSize: '48px' }}>🗺️</div>
          <div style={{ fontSize: '14px', color: '#999' }}>Loading map...</div>
        </div>
      </>
    );
  }

  // Default: card
  return (
    <>
      <style>{shimmer}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '15px'
          }}
        >
          <div
            style={{
              ...skeletonStyle,
              height: '24px',
              width: '60%',
              marginBottom: '15px'
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: '16px',
              width: '100%',
              marginBottom: '8px'
            }}
          />
          <div
            style={{
              ...skeletonStyle,
              height: '16px',
              width: '80%'
            }}
          />
        </div>
      ))}
    </>
  );
}
