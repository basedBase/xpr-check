const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/v1',
    createProxyMiddleware({
      target: 'https://api-xprnetwork-main.saltant.io/',
      changeOrigin: true,
    })
  );
  app.use(
    '/v3',
    createProxyMiddleware({
      target: 'https://api.coingecko.com/api',
      changeOrigin: true,
    })
  );
};