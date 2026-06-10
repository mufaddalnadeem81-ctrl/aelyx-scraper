const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Configures the cache directory for Puppeteer browser downloads
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
