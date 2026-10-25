const { defineConfig } = require('@playwright/test');
const port = Number(process.env.TFS_TEST_PORT || 8381);
module.exports = defineConfig({
  outputDir: './test-results/browser',
  testDir: './tests/ocr-browser', timeout: 120000, workers: 1,
  reporter: 'list',
  use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${port}`,
    serviceWorkers: 'block', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  webServer: { command: `node scripts/preview-server.cjs --port ${port}`, url: `http://127.0.0.1:${port}/T4Slvers_CAC/`,
    reuseExistingServer: false, timeout: 10000 }
});
