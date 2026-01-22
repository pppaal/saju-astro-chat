const headers = new Headers();
headers.set('content-length', '300000');

const req = new Request('http://localhost:3000/api/test', {
  method: 'POST',
  headers,
  body: 'x'.repeat(1000),
  duplex: 'half',
});

console.log('Set content-length:', '300000');
console.log('Actual content-length:', req.headers.get('content-length'));
console.log('All headers:');
for (const [key, value] of req.headers.entries()) {
  console.log(`  ${key}: ${value}`);
}
