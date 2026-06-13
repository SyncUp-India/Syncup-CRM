export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: 0 }}>404</h1>
      <p style={{ color: '#666', margin: '1rem 0' }}>Page not found</p>
      <a href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>Go home</a>
    </div>
  );
}
