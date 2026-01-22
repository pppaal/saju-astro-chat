import { enforceBodySize } from './src/lib/http.ts';

const headers = new Headers();
headers.set('content-length', '300000');

const req = new Request('http://localhost:3000/api/test', {
  method: 'POST',
  headers,
  body: 'x'.repeat(1000),
  duplex: 'half',
});

console.log('Request content-length:', req.headers.get('content-length'));

const result = enforceBodySize(req, 256 * 1024);
console.log('Result:', result);
console.log('Is null:', result === null);
console.log('Status:', result?.status);
