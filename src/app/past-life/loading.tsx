export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    }}>
      <div style={{
        textAlign: 'center',
        color: '#a78bfa',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          animation: 'spin 2s linear infinite',
        }}>
          🔄
        </div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
