require('dotenv').config();

const { devices } = require('@playwright/test');

const config = {
  testDir: './tests',
  retries: 1,
  //by default playwright runs 5 tests parallely
  workers: 1,
  timeout: 3000 * 100,
  expect: {
    timeout: 30000
  },
//reporter: 'html',
reporter: [
    ['list', { printSteps: false }],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }]
],

//trace: 'on',
//screenshot: 'only-on-failure',

//fullyParallel: true,
use: {
  actionTimeout: 300 * 100,
  navigationTimeout: 300 * 100,

  browserName: 'chromium',

  // 👇 IMPORTANT
  headless: false,

  // 👇 Smooth demo execution
  launchOptions: {
    slowMo: 800
  },

  screenshot: 'only-on-failure',

  // 👇 Always keep video
  video: {
    mode: 'on',
    size: { width: 1920, height: 1080 }
  },

  trace: 'retain-on-failure',

  geolocation: { latitude: 28.6139, longitude: 77.2090 },

  locale: 'en-IN',

  permissions: ['geolocation'],

  timezoneId: 'Asia/Kolkata',

  // 👇 Better for social media
  viewport: {
    width: 1600,
    height: 900
  }
}
};

module.exports = config;
