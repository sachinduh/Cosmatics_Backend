// Run: npm test   (uses Node's built-in test runner, no extra dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCorsOptions } = require('../config/cors');

const prodEnv = { NODE_ENV: 'production', FRONTEND_URL: 'https://cosmeticsvelvet.netlify.app' };
const { isOriginAllowed, options } = buildCorsOptions(prodEnv);

test('production Netlify origin is allowed (also with trailing slash in FRONTEND_URL)', () => {
  assert.equal(isOriginAllowed('https://cosmeticsvelvet.netlify.app'), true);
  const o = buildCorsOptions({ ...prodEnv, FRONTEND_URL: 'https://cosmeticsvelvet.netlify.app/' });
  assert.equal(o.isOriginAllowed('https://cosmeticsvelvet.netlify.app'), true);
});

test('deploy-preview / branch-preview origins of this site are allowed', () => {
  assert.equal(isOriginAllowed('https://6ad866ec3fa94288069803e3--cosmeticsvelvet.netlify.app'), true);
  assert.equal(isOriginAllowed('https://deploy-preview-12--cosmeticsvelvet.netlify.app'), true);
  assert.equal(isOriginAllowed('https://my-branch--cosmeticsvelvet.netlify.app'), true);
});

test('unapproved origins are rejected', () => {
  for (const o of [
    'https://evil.example.com',
    'https://cosmeticsvelvet.netlify.app.evil.com',
    'https://evil.com/--cosmeticsvelvet.netlify.app',
    'http://cosmeticsvelvet.netlify.app',
    'https://abc--othersite.netlify.app',
    'https://abc--cosmeticsvelvet.netlify.app.evil.com',
    'https://--cosmeticsvelvet.netlify.app',
    'https://xcosmeticsvelvet.netlify.app',
    'http://localhost:5173'
  ]) assert.equal(isOriginAllowed(o), false, o);
});

test('requests without an Origin header (curl, health checks) are allowed', () => {
  assert.equal(isOriginAllowed(undefined), true);
});

test('localhost is allowed only outside production', () => {
  assert.equal(buildCorsOptions({ NODE_ENV: 'development' }).isOriginAllowed('http://localhost:5173'), true);
});

test('previews can be disabled with NETLIFY_PREVIEW_SITE=off', () => {
  const o = buildCorsOptions({ ...prodEnv, NETLIFY_PREVIEW_SITE: 'off' });
  assert.equal(o.isOriginAllowed('https://6ad866ec3fa94288069803e3--cosmeticsvelvet.netlify.app'), false);
  assert.equal(o.isOriginAllowed('https://cosmeticsvelvet.netlify.app'), true);
});

test('policy: required methods/headers, no wildcard, no credentials', () => {
  assert.deepEqual(options.methods, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
  assert.ok(options.allowedHeaders.includes('Content-Type') && options.allowedHeaders.includes('Authorization'));
  assert.equal(options.credentials, false);
  options.origin('https://cosmeticsvelvet.netlify.app', (e, allowed) => assert.equal(allowed, true));
  options.origin('https://evil.example.com', (e, allowed) => assert.equal(allowed, false));
});
