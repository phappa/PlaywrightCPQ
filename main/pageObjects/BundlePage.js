// main/pageObjects/BundlePage.js

class BundlePage {
    constructor(page) {
        this.page = page;
    }

    // =========================
    // 🔍 DEEP FIND HELPER
    // =========================
   _getDeepFindScript(productCode, elementType) {
    return `
        (function() {
            function deepFindAll(root, selector, results) {
                results = results || [];
                var found = root.querySelectorAll(selector);
                for (var i = 0; i < found.length; i++) results.push(found[i]);
                var all = root.querySelectorAll('*');
                for (var j = 0; j < all.length; j++) {
                    if (all[j].shadowRoot) deepFindAll(all[j].shadowRoot, selector, results);
                }
                return results;
            }

            var allSpans = deepFindAll(document, 'span#me');
            var targetSpan = null;
            for (var i = 0; i < allSpans.length; i++) {
                if (allSpans[i].textContent.trim() === '${productCode}') {
                    targetSpan = allSpans[i];
                    break;
                }
            }
            if (!targetSpan) return 'span-not-found';

            var node = targetSpan;
            var swipeContainer = null;
            for (var j = 0; j < 15; j++) {
                if (!node) break;
                if (node.tagName === 'SB-SWIPE-CONTAINER') {
                    swipeContainer = node;
                    break;
                }
                node = node.parentElement || (node.getRootNode && node.getRootNode().host);
            }

            if (!swipeContainer) return 'swipe-container-not-found';

            var elements = deepFindAll(swipeContainer, '${elementType}');
            if (!elements.length) return '${elementType}-not-found';

            var el = elements[0];

            // Already selected check
            if (el.getAttribute('aria-checked') === 'true') {
                return 'already-selected';
            }

            el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            return 'clicked';
        })()
    `;
}

    // =========================
    // 📻 SELECT RADIO OPTION
    // =========================
  async selectRadioOption(productCode) {
    await this.page.waitForTimeout(1000);

    const sbFrame = this.page.frames().find(f =>
        f.url().includes('/apex/sb?') && f.url().includes('sbqq')
    );

    if (!sbFrame) throw new Error('❌ Configure Products frame not found');

    const result = await sbFrame.evaluate(
        this._getDeepFindScript(productCode, 'paper-radio-button')
    );

    if (result === 'already-selected' || result === 'span-not-found') {
        console.log(`ℹ️ ${productCode} — already selected, skipping`);
        return;
    }

    if (result !== 'clicked') {
        throw new Error(`❌ Radio select failed for ${productCode}: ${result}`);
    }
    console.log(`✅ Radio selected: ${productCode}`);
}
    // =========================
    // ☑️ SELECT CHECKBOX OPTION
    // =========================
   async selectCheckboxOption(productCode) {
    await this.page.waitForTimeout(1000);

    const sbFrame = this.page.frames().find(f =>
        f.url().includes('/apex/sb?') && f.url().includes('sbqq')
    );

    if (!sbFrame) throw new Error('❌ Configure Products frame not found');

    const result = await sbFrame.evaluate(
        this._getDeepFindScript(productCode, 'paper-checkbox')
    );

    if (result === 'already-selected' || result === 'span-not-found') {
        console.log(`ℹ️ ${productCode} — already selected, skipping`);
        return;
    }

    if (result !== 'clicked') {
        throw new Error(`❌ Checkbox select failed for ${productCode}: ${result}`);
    }
    console.log(`✅ Checkbox selected: ${productCode}`);
}
    
    // ⚙️ CONFIGURE BUNDLE
    
    async configureBundleOptions(options) {
        for (const option of options) {
            if (option.selectionType === 'radio') {
                await this.selectRadioOption(option.productCode);
            } else if (option.selectionType === 'checkbox') {
                await this.selectCheckboxOption(option.productCode);
            }
            await this.page.waitForTimeout(500);
        }
        console.log('✅ All bundle options configured');
    }

    // =========================
    // 💾 SAVE BUNDLE CONFIG
    // =========================
   async saveBundleConfig() {
    const sbFrame = this.page.frames().find(f =>
        f.url().includes('/apex/sb?') && f.url().includes('sbqq')
    );

    if (!sbFrame) throw new Error('❌ Configure Products frame not found');

    // Save button click via frameLocator
    const frame = this.page.frameLocator('iframe[name^="vfFrameId_"][height="100%"]');
    await frame.getByRole('button', { name: 'Save', exact: true }).click();
    console.log('💾 Bundle config saved');

    await this.page.waitForTimeout(3000);
    console.log('✅ Back to QLE');
}
}

module.exports = { BundlePage };