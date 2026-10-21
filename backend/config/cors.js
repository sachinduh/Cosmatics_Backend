const cors = require('cors');

/**
 * CORS policy for the POS API.
 *
 * The API authenticates with an "Authorization: Bearer <jwt>" header (no cookies), so
 * credentials are NOT enabled. Only explicitly approved origins get CORS headers:
 *   1. FRONTEND_URL            comma separated exact origins, e.g. https://cosmeticsvelvet.netlify.app
 *   2. NETLIFY_PREVIEW_SITE    Netlify site name; also approves its deploy/branch previews, i.e.
 *                              https://<deploy-id-or-branch>--<site>.netlify.app
 *                              (set to "off" to disable preview origins)
 *   3. localhost               only when NODE_ENV is not "production"
 */
const DEFAULT_PREVIEW_SITE = 'cosmeticsvelvet';

function normalizeOrigin(o) {
  return String(o || '').trim().replace(/\/+$/, '');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCorsOptions(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const allowedOrigins = (env.FRONTEND_URL || '').split(',').map(normalizeOrigin).filter(Boolean);

  const previewSite = (env.NETLIFY_PREVIEW_SITE === undefined ? DEFAULT_PREVIEW_SITE : env.NETLIFY_PREVIEW_SITE)
    .trim().toLowerCase();
  const previewRegex = previewSite && previewSite !== 'off' && /^[a-z0-9-]+$/.test(previewSite)
    ? new RegExp(`^https://[a-z0-9]+(?:-[a-z0-9]+)*--${escapeRegExp(previewSite)}\\.netlify\\.app$`)
    : null;

  function isOriginAllowed(origin) {
    if (!origin) return true; // curl, health checks, server-to-server: no Origin header
    const o = normalizeOrigin(origin);
    if (allowedOrigins.includes(o)) return true;
    if (previewRegex && previewRegex.test(o)) return true;
    if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return true;
    return false;
  }

  const options = {
    origin(origin, callback) {
      // Not allowed => no CORS headers are sent and the browser blocks the call (no server error)
      callback(null, isOriginAllowed(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: false,
    maxAge: 600,
    optionsSuccessStatus: 204
  };
  return { options, isOriginAllowed, allowedOrigins, previewEnabled: !!previewRegex };
}

function createCors(env = process.env) {
  const built = buildCorsOptions(env);
  return { middleware: cors(built.options), ...built };
}

module.exports = { createCors, buildCorsOptions };
