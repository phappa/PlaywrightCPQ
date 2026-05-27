const { product } = require('../utilities/testData');

class QLEPage {

    constructor(page) {
        this.page = page;
    }

    async openQuoteRecord(quoteId) {
        const url = `${process.env.SF_INSTANCE_URL}/lightning/r/SBQQ__Quote__c/${quoteId}/view`;
        console.log(`🌐 Opening Quote: ${url}`);

        await this.page.goto(url);
        await this.page.waitForURL('**/lightning/r/SBQQ__Quote__c/**', { timeout: 30000 });

        console.log('✅ Quote record page loaded');
    }

    async clickEditLines() {
        const editLinesBtn = this.page.locator('button.slds-button:has-text("Edit Lines")');

        await editLinesBtn.waitFor({ timeout: 20000 });
        await editLinesBtn.click();

        console.log('🖱️ Edit Lines clicked');

        await this.page.waitForSelector(
            'iframe[name^="vfFrameId_"][height="100%"]',
            { timeout: 30000 }
        );

        console.log('✅ QLE iframe detected');
    }

    // ── FIX 1: sbFrame was used before being declared. ──────────────────────────
    // The merge left an orphaned `if (sbFrame)` block from one branch inside a
    // method that never declared sbFrame. Fixed by fetching sbFrame first, then
    // conditionally using it (same pattern as forceClosePricebookPopup).
    async handlePricebookDialog() {
        await this.forceClosePricebookPopup();

        const frame = this.page.frameLocator(
            'iframe[name^="vfFrameId_"][height="100%"]'
        );

        await frame
            .getByRole('button', { name: 'Add Products' })
            .waitFor({ timeout: 60000 });

        const sbFrame = this.page.frames().find(f => f.url().includes('/apex/sb?'));

        if (sbFrame) {
            const clicked = await sbFrame.evaluate(() => {
                function deepFindAll(root, selector, results = []) {
                    results.push(...root.querySelectorAll(selector));
                    for (const node of root.querySelectorAll('*')) {
                        if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                    }
                    return results;
                }

                const saveBtn = deepFindAll(document, 'paper-button[slot="paper-button"].primary')[0];
                if (!saveBtn) return 'no-primary-btn';

                saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
                return 'clicked-primary-save';
            });

            console.log(`🔍 Pricebook result: ${clicked}`);
            await this.page.waitForTimeout(3000);
        }

        await frame.getByRole('button', { name: 'Add Products' })
            .waitFor({ timeout: 30000 });

        console.log('✅ QLE fully loaded');
    }

    async forceClosePricebookPopup() {
        await this.page.waitForTimeout(3000);

        const sbFrame = this.page.frames().find(f => f.url().includes('/apex/sb?'));

        if (!sbFrame) {
            console.log('ℹ️ QLE frame not found while checking pricebook popup');
            return;
        }

        for (let i = 1; i <= 5; i++) {
            const result = await sbFrame.evaluate(() => {
                function deepFindAll(root, selector, results = []) {
                    if (!root) return results;

                    results.push(...root.querySelectorAll(selector));

                    for (const node of root.querySelectorAll('*')) {
                        if (node.shadowRoot) {
                            deepFindAll(node.shadowRoot, selector, results);
                        }
                    }

                    return results;
                }

                const dialogs = deepFindAll(document, 'sb-pricebook-dialog');

                const visibleDialog = dialogs.find(dialog => {
                    const rect = dialog.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });

                if (!visibleDialog) {
                    return 'no-visible-pricebook-dialog';
                }

                const buttons = deepFindAll(document, 'paper-button, button');

                const saveBtn = buttons.find(btn => {
                    const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
                    return text === 'save';
                });

                if (!saveBtn) {
                    return 'save-button-not-found';
                }

                saveBtn.click();
                saveBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
                saveBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true, cancelable: true }));
                saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));

                return 'pricebook-save-clicked';
            });

            console.log(`🔍 Force pricebook result attempt ${i}: ${result}`);

            await this.page.waitForTimeout(4000);

            if (result === 'no-visible-pricebook-dialog') {
                break;
            }
        }
    }

    // Used by amendment-flow.spec.js — unchanged
    async clickAddProducts(productCode = product.code) {
        const frame = this.page.frameLocator(
            'iframe[name^="vfFrameId_"][height="100%"]'
        );

        await this.forceClosePricebookPopup();

        await frame.getByRole('button', { name: 'Add Products' }).click();

        console.log('🖱️ Add Products clicked');

        await frame
            .locator(`span#me:has-text("${productCode}")`)
            .waitFor({ timeout: 30000 });

        console.log(`✅ Product catalog loaded — looking for: ${productCode}`);
    }

    // ── FIX 2: Used by bundle.spec.js ───────────────────────────────────────────
    // The merge dropped the closing }) and } of the filter() chain on the FIRST
    // (incomplete) selectProduct, then immediately started clickAddProductsWithSearch
    // without a closing brace for selectProduct. This entire first selectProduct
    // stub was dead/duplicate code — the SECOND selectProduct (labelled
    // "🆕 quantity support added") is the complete, correct implementation from
    // the feature branch. The stub is removed; only the full version is kept.
    async clickAddProductsWithSearch(productCode) {
        const frame = this.page.frameLocator('iframe[name^="vfFrameId_"][height="100%"]');

        await frame.getByRole('button', { name: 'Add Products' }).click();
        console.log('🖱️ Add Products clicked');

        await this.page.waitForTimeout(3000);

        const sbFrame = this.page.frames().find(f => f.url().includes('/apex/sb?'));
        if (!sbFrame) throw new Error('❌ QLE frame not found');

        // Step 1: Fill the visible search input
        const fillResult = await sbFrame.evaluate((code) => {
            function deepFindAll(root, selector, results = []) {
                results.push(...root.querySelectorAll(selector));
                for (const node of root.querySelectorAll('*')) {
                    if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                }
                return results;
            }

            const inputs = deepFindAll(document, 'input#itemLabel')
                .filter(i => i.placeholder === 'Search Products');

            const input = inputs.find(i => i.offsetParent !== null);
            if (!input) return 'input-not-found';

            input.focus();
            input.click();

            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeSetter.call(input, code);

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            return 'filled';
        }, productCode);

        console.log(`🔍 Search input result: ${fillResult}`);
        await this.page.waitForTimeout(1000);

        // Step 2: Click the search button
        const searchResult = await sbFrame.evaluate(() => {
            function deepFindAll(root, selector, results = []) {
                results.push(...root.querySelectorAll(selector));
                for (const node of root.querySelectorAll('*')) {
                    if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                }
                return results;
            }

            const searchBtns = deepFindAll(document, 'paper-button#search')
                .filter(btn => btn.offsetParent !== null);

            const btn = searchBtns[0];
            if (!btn) return 'btn-not-found';

            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            return 'clicked';
        });

        console.log(`🔍 Search button result: ${searchResult}`);
        await this.page.waitForTimeout(2000);

        // Step 3: Wait for product to appear
        let found = false;
        for (let i = 0; i < 15; i++) {
            found = await sbFrame.evaluate((code) => {
                function deepFindAll(root, selector, results = []) {
                    results.push(...root.querySelectorAll(selector));
                    for (const node of root.querySelectorAll('*')) {
                        if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                    }
                    return results;
                }
                const spans = deepFindAll(document, 'span#me');
                return spans.some(s => s.textContent.trim().toUpperCase() === code.toUpperCase());
            }, productCode);

            if (found) break;
            console.log(`⏳ Waiting for product... attempt ${i + 1}/15`);
            await this.page.waitForTimeout(1000);
        }

        if (!found) throw new Error(`❌ Product not found after search: ${productCode}`);
        console.log(`✅ Product found: ${productCode}`);
    }

    // ── FIX 3: Duplicate selectProduct resolved ──────────────────────────────────
    // Repo 1 had an incomplete stub (no .getByRole, no click, no await).
    // Repo 2 had the full implementation with .getByRole('checkbox'), click,
    // plSelect, and waitFor. The complete version from Repo 2 is kept.
    // The duplicate internal log + plSelect click that existed inside the
    // second copy are also deduplicated here — kept only the final .first()
    // waitFor pattern which is the most defensive.
    async selectProduct(productCode = product.code) {
        const frame = this.page.frameLocator('iframe[name^="vfFrameId_"][height="100%"]');

        const productCheckbox = frame
            .locator('sb-swipe-container')
            .filter({ has: frame.locator(`span#me:has-text("${productCode}")`) })
            .getByRole('checkbox');

        await productCheckbox.waitFor({ timeout: 20000 });
        await productCheckbox.click();

        console.log(`✅ Product ${productCode} selected`);

        await frame.locator('paper-button#plSelect').click();
        console.log('🖱️ Select clicked — product added to QLE');

        await frame.locator(`span#me:has-text("${productCode}")`).first().waitFor({ timeout: 30000 });

        console.log('✅ Product line appeared in QLE');
    }

    async clickCalculate() {
        const frame = this.page.frameLocator(
            'iframe[name^="vfFrameId_"][height="100%"]'
        );

        const calcBtn = frame.getByRole('button', { name: 'Calculate' });

        await calcBtn.waitFor({ timeout: 30000 });
        await calcBtn.click({ force: true });

        console.log('🧮 Calculate clicked');

        await this.page.waitForTimeout(5000);

        console.log('✅ Pricing calculated');
    }

    async saveQuoteLines() {
        const frame = this.page.frameLocator(
            'iframe[name^="vfFrameId_"][height="100%"]'
        );

        const saveBtn = frame.getByRole('button', {
            name: 'Save',
            exact: true
        });

        await saveBtn.waitFor({ timeout: 30000 });
        await saveBtn.click({ force: true });

        console.log('💾 Save clicked');

        await this.page.waitForURL(
            '**/lightning/r/SBQQ__Quote__c/**',
            { timeout: 60000 }
        );

        console.log('✅ Redirected to Quote record page');

        await this.page.waitForTimeout(5000);

        console.log('✅ Quote Lines saved successfully');
    }
}

module.exports = { QLEPage };