class DemoHelper {

  constructor(page) {
    this.page = page;
  }

  // ============================================
  // INJECT OVERLAY (SAFE + LIGHTWEIGHT)
  // ============================================

  async injectOverlay() {

    try {

      await this.page.evaluate(() => {

        if (document.getElementById('cpq-demo-overlay')) return;

        const overlay = document.createElement('div');

        overlay.id = 'cpq-demo-overlay';

        overlay.innerHTML = `
          <div id="cpq-demo-phase">
            🚀 SALESFORCE CPQ DEMO
          </div>
          <div id="cpq-demo-step">
            Initializing...
          </div>
        `;

        Object.assign(overlay.style, {

          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',

          width: '55%',
          minHeight: '90px',

          padding: '14px 20px',

          background: 'rgba(0,0,0,0.88)',

          border: '2px solid #00ffcc',

          borderRadius: '14px',

          zIndex: '999999',

          color: '#ffffff',

          fontFamily: 'Arial, sans-serif',

          backdropFilter: 'blur(8px)',

          boxShadow: '0 0 18px rgba(0,255,204,0.35)',

          textAlign: 'center'
        });

        const phase = overlay.querySelector('#cpq-demo-phase');

        Object.assign(phase.style, {

          fontSize: '26px',

          fontWeight: 'bold',

          color: '#00ffcc',

          marginBottom: '8px',

          letterSpacing: '0.5px'
        });

        const step = overlay.querySelector('#cpq-demo-step');

        Object.assign(step.style, {

          fontSize: '20px',

          fontWeight: '500',

          color: '#ffffff',

          lineHeight: '1.4'
        });

        document.body.appendChild(overlay);

      });

    } catch (e) {

      console.log('Overlay inject skipped due to navigation');
    }
  }

  // ============================================
  // ENSURE OVERLAY EXISTS (NAV SAFE)
  // ============================================

  async ensureOverlay() {

    try {

      await this.injectOverlay();

    } catch (e) {

      // ignore navigation flicker
    }
  }

  // ============================================
  // SHOW STEP (MAIN NARRATION)
  // ============================================

  async showStep(message, wait = 2000) {

    await this.ensureOverlay();

    try {

      await this.page.evaluate((msg) => {

        const step = document.getElementById('cpq-demo-step');

        if (step) {

          step.innerHTML = `✨ ${msg}`;
        }

      }, message);

    } catch (e) {

      console.log('Step render skipped');
    }

    console.log(`👉 ${message}`);

    await this.page.waitForTimeout(wait);
  }

  // ============================================
  // SHOW PHASE (BIG HEADER CHANGE)
  // ============================================

  async showPhase(title) {

    await this.ensureOverlay();

    try {

      await this.page.evaluate((phaseTitle) => {

        const phase = document.getElementById('cpq-demo-phase');

        const step = document.getElementById('cpq-demo-step');

        if (phase) {
          phase.innerHTML = phaseTitle;
        }

        if (step) {
          step.innerHTML = 'Executing workflow...';
        }

      }, title);

    } catch (e) {

      console.log('Phase render skipped');
    }

    console.log(`🚀 ${title}`);

    await this.page.waitForTimeout(3000);
  }

  // ============================================
  // ELEMENT HIGHLIGHT (OPTIONAL USE LATER)
  // ============================================

  async highlightElement(locator) {

    try {

      await locator.evaluate((el) => {

        el.style.transition = 'all 0.25s ease';

        el.style.boxShadow = '0 0 18px #00ffcc';

        el.style.border = '2px solid #00ffcc';

        el.style.position = 'relative';

        el.style.zIndex = '9999';

      });

    } catch (e) {

      console.log('Highlight skipped');
    }

    await this.page.waitForTimeout(800);
  }
}

module.exports = { DemoHelper };