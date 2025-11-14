interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'progress';
}

export default function LoadingIndicator({ 
  message = 'Loading...', 
  size = 'medium',
  type = 'spinner'
}: LoadingIndicatorProps) {
  
  const sizeMap = {
    small: { icon: '24px', text: '12px' },
    medium: { icon: '48px', text: '14px' },
    large: { icon: '64px', text: '16px' }
  };

  const styles = sizeMap[size];

  if (type === 'dots') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '15px'
        }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#007bff',
                animation: `bounce 1.4s infinite ease-in-out both`,
                animationDelay: `${i * 0.16}s`
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: styles.text, color: '#666' }}>
          {message}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'progress') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          width: '200px',
          height: '4px',
          background: '#e0e0e0',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '15px'
        }}>
          <div
            style={{
              width: '50%',
              height: '100%',
              background: '#007bff',
              animation: 'progress 1.5s ease-in-out infinite'
            }}
          />
        </div>
        <div style={{ fontSize: styles.text, color: '#666' }}>
          {message}
        </div>
        <style>{`
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  // Default: spinner
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        style={{
          width: styles.icon,
          height: styles.icon,
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '15px'
        }}
      />
      <div style={{ fontSize: styles.text, color: '#666' }}>
        {message}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
