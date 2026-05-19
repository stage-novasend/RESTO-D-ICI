import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBackendOrigin,
  resolveFrontendApiAndSocketBase,
} from './backend-endpoints.js';

test('resolveBackendOrigin uses fallback when no env values are provided', () => {
  const origin = resolveBackendOrigin();
  assert.equal(origin, 'http://localhost:3000');
});

test('resolveBackendOrigin uses VITE_BACKEND_ORIGIN when VITE_API_URL is relative', () => {
  const origin = resolveBackendOrigin({
    viteApiUrl: '/api',
    viteBackendOrigin: 'http://localhost:4010',
  });

  assert.equal(origin, 'http://localhost:4010');
});

test('resolveBackendOrigin prioritizes absolute VITE_API_URL origin', () => {
  const origin = resolveBackendOrigin({
    viteApiUrl: 'http://localhost:5555/api',
    viteBackendOrigin: 'http://localhost:4010',
  });

  assert.equal(origin, 'http://localhost:5555');
});

test('resolveFrontendApiAndSocketBase keeps proxy path defaults when API url is unset', () => {
  const resolved = resolveFrontendApiAndSocketBase({
    browserOrigin: 'http://localhost:5173',
  });

  assert.deepEqual(resolved, {
    apiBaseUrl: '/api',
    socketBase: 'http://localhost:5173',
  });
});

test('resolveFrontendApiAndSocketBase derives socket base from absolute API url', () => {
  const resolved = resolveFrontendApiAndSocketBase({
    viteApiUrl: 'http://localhost:4010/api',
    browserOrigin: 'http://localhost:5173',
  });

  assert.deepEqual(resolved, {
    apiBaseUrl: 'http://localhost:4010/api',
    socketBase: 'http://localhost:4010',
  });
});

test('resolveFrontendApiAndSocketBase appends /api when absolute API url has no suffix', () => {
  const resolved = resolveFrontendApiAndSocketBase({
    viteApiUrl: 'http://localhost:4010',
    browserOrigin: 'http://localhost:5173',
  });

  assert.deepEqual(resolved, {
    apiBaseUrl: 'http://localhost:4010/api',
    socketBase: 'http://localhost:4010',
  });
});
