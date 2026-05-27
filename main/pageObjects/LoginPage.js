const { expect } = require('@playwright/test');
require('dotenv').config();

class LoginPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Login via JWT access token
   * Navigates to Salesforce Lightning home using Frontdoor URL
   */
  async loginWithToken(accessToken) {
    // Construct Frontdoor URL
    const frontdoorUrl = `${process.env.SALESFORCE_INSTANCE}/secur/frontdoor.jsp?sid=${accessToken}&retURL=/lightning/page/home`;
    console.log('Frontdoor URL:', frontdoorUrl);

    // Go to Lightning home page via Frontdoor
   await this.page.goto(frontdoorUrl, { waitUntil: 'load' });

    // Wait for Lightning home to load
    await this.page.waitForURL(/.*lightning\/.*/, { timeout: 30000 });

    // Optional: confirm home loaded
    const currentUrl = this.page.url();
    console.log('Current URL:', currentUrl);
    expect(currentUrl).toMatch(/lightning/);
  }
}

module.exports = { LoginPage };
