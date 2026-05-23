/**
 * Proxy del dev server (Vite/Angular).
 * - En Docker: BACKEND_PROXY_TARGET=http://ugr_backend:3000
 * - En local (npm start en el PC): por defecto http://127.0.0.1:3000
 */
const target = process.env.BACKEND_PROXY_TARGET || 'http://127.0.0.1:3000';

const apiProxy = {
  target,
  secure: false,
  changeOrigin: true,
};

module.exports = {
  '/auth': apiProxy,
  '/user': apiProxy,
  '/events': apiProxy,
  '/friends': apiProxy,
};
