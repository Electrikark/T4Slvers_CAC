const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/ocr-browser', timeout: 120000, workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:8381',
    serviceWorkers: 'block', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/preview-server.cjs', url: 'http://127.0.0.1:8381/T4Slvers_CAC/',
    reuseExistingServer: !process.env.CI, timeout: 10000 }
});
