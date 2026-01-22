import { enforceBodySize } from './src/lib/http.ts';

const createRequest = (contentLength) => {
  const headers = new Headers();
  if (contentLength !== undefined) {
    headers.set('content-length', contentLength);
  }
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers,
  });
};

const req = createRequest('1025');
console.log('Content-Length:', req.headers.get('content-length'));
const result = enforceBodySize(req, 1024);
console.log('Result:', result);
console.log('Is null:', result === null);
