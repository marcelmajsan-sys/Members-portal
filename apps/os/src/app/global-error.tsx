'use client';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#1B365D', fontSize: '24px' }}>Nešto je pošlo po krivu</h1>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '12px' }}>
          Došlo je do neočekivane greške. Pokušajte ponovo.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            cursor: 'pointer',
            backgroundColor: '#1B365D',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Pokušaj ponovo
        </button>
      </body>
    </html>
  );
}
