'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: 'red' }}>Error Debug</h1>
      <pre style={{ background: '#f5f5f5', padding: '20px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
        {error.message}
      </pre>
      <pre style={{ background: '#f0f0f0', padding: '20px', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        Pokušaj ponovo
      </button>
    </div>
  );
}
