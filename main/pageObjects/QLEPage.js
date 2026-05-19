const { product } = require('../utilities/testData');

class QLEPage {

    constructor(page) {
        this.page = page;
    }

    async openQuoteRecord(quoteId) {

        const url =
            `${process.env.SF_INSTANCE_URL}/lightning/r/SBQQ__Quote__c/${quoteId}/view`;

        console.log(`🌐 Opening Quote: ${url}`);

        await this.page.goto(url);

        await this.page.waitForURL(
            '**/lightning/r/SBQQ__Quote__c/**',
            { timeout: 30000 }
        );

        console.log('✅ Quote record page loaded');
    }

    async clickEditLines() {

        const editLinesBtn =
            this.page.locator(
                'button.slds-button:has-text("Edit Lines")'
            );

        await editLinesBtn.waitFor({ timeout: 20000 });

        await editLinesBtn.click();

        console.log('🖱️ Edit Lines clicked');

        await this.page.waitForSelector(
            'iframe[name^="vfFrameId_"][height="100%"]',
            { timeout: 30000 }
        );

        console.log('✅ QLE iframe detected');
    }

    async handlePricebookDialog() {

        const frame =
            this.page.frameLocator(
                'iframe[name^="vfFrameId_"][height="100%"]'
            );

        await this.page.waitForTimeout(5000);

        const sbFrame =
            this.page.frames().find(
                f => f.url().includes('/apex/sb?')
            );

        if (sbFrame) {

            const clicked = await sbFrame.evaluate(() => {

                function deepFindAll(root, selector, results = []) {

                    if (!root) return results;

                    results.push(...root.querySelectorAll(selector));

                    for (const node of root.querySelectorAll('*')) {

                        if (node.shadowRoot) {
                            deepFindAll(
                                node.shadowRoot,
                                selector,
                                results
                            );
                        }
                    }

                    return results;
                }

                const primaryBtn =
                    deepFindAll(
                        document,
                        'paper-button[slot="paper-button"].primary'
                    )[0];

                const allButtons =
                    deepFindAll(document, 'paper-button, button');

                const saveByText = allButtons.find(btn => {

                    const text =
                        (btn.innerText || btn.textContent || '')
                            .trim()
                            .toLowerCase();

                    return text === 'save';
                });

                const saveBtn = primaryBtn || saveByText;

                if (!saveBtn) {
                    return 'no-save-btn';
                }

                saveBtn.click();

                return 'clicked-pricebook-save';
            });

            console.log(`🔍 Pricebook result: ${clicked}`);

            await this.page.waitForTimeout(5000);
        }

        await frame
            .getByRole('button', { name: 'Add Products' })
            .waitFor({ timeout: 30000 });

        console.log('✅ QLE fully loaded');
    }

    async forceClosePricebookPopup() {

        await this.page.waitForTimeout(2000);

        const sbFrame =
            this.page.frames().find(
                f => f.url().includes('/apex/sb?')
            );

        if (!sbFrame) {
            console.log(
                'ℹ️ QLE frame not found while checking pricebook popup'
            );
            return;
        }

        const result = await sbFrame.evaluate(() => {

            function deepFindAll(root, selector, results = []) {

                if (!root) return results;

                results.push(...root.querySelectorAll(selector));

                for (const node of root.querySelectorAll('*')) {

                    if (node.shadowRoot) {
                        deepFindAll(
                            node.shadowRoot,
                            selector,
                            results
                        );
                    }
                }

                return results;
            }

            const dialogs =
                deepFindAll(document, 'sb-pricebook-dialog');

            const visibleDialog = dialogs.find(dialog => {

                const rect =
                    dialog.getBoundingClientRect();

                return rect.width > 0 && rect.height > 0;
            });

            if (!visibleDialog) {
                return 'no-visible-pricebook-dialog';
            }

            const allButtons =
                deepFindAll(document, 'paper-button, button');

            const saveBtn = allButtons.find(btn => {

                const text =
                    (btn.innerText || btn.textContent || '')
                        .trim()
                        .toLowerCase();

                return text === 'save';
            });

            if (!saveBtn) {
                return 'save-button-not-found';
            }

            saveBtn.click();

            return 'pricebook-save-clicked';
        });

        console.log(`🔍 Force pricebook result: ${result}`);

        await this.page.waitForTimeout(5000);
    }

    async clickAddProducts(
        productCode = product.code
    ) {

        const frame =
            this.page.frameLocator(
                'iframe[name^="vfFrameId_"][height="100%"]'
            );

        await frame
            .getByRole('button', { name: 'Add Products' })
            .click();

        console.log('🖱️ Add Products clicked');

        await frame
            .locator(`span#me:has-text("${productCode}")`)
            .waitFor({ timeout: 30000 });

        console.log(
            `✅ Product catalog loaded — looking for: ${productCode}`
        );
    }

    async selectProduct(
        productCode = product.code
    ) {

        const frame =
            this.page.frameLocator(
                'iframe[name^="vfFrameId_"][height="100%"]'
            );

        const productCheckbox =
            frame
                .locator('sb-swipe-container')
                .filter({
                    has: frame.locator(
                        `span#me:has-text("${productCode}")`
                    )
                })
                .getByRole('checkbox');

        await productCheckbox.waitFor({ timeout: 20000 });

        await productCheckbox.click();

        console.log(`✅ Product ${productCode} selected`);

        await frame.locator('paper-button#plSelect').click();

        console.log(
            '🖱️ Select clicked — product added to QLE'
        );

        await frame
            .locator(`span#me:has-text("${productCode}")`)
            .waitFor({ timeout: 30000 });

        console.log('✅ Product line appeared in QLE');
    }

    async clickCalculate() {

        await this.forceClosePricebookPopup();

        const frame =
            this.page.frameLocator(
                'iframe[name^="vfFrameId_"][height="100%"]'
            );

        await frame
            .getByRole('button', { name: 'Calculate' })
            .click();

        console.log('🧮 Calculate clicked');

        await frame
            .locator('.slds-spinner')
            .waitFor({
                state: 'hidden',
                timeout: 30000
            })
            .catch(() =>
                console.log(
                    'ℹ️ Spinner not found — calculation instant'
                )
            );

        console.log('✅ Pricing calculated');
    }

    async saveQuoteLines() {

        await this.forceClosePricebookPopup();

        const frame =
            this.page.frameLocator(
                'iframe[name^="vfFrameId_"][height="100%"]'
            );

        await frame
            .getByRole('button', {
                name: 'Save',
                exact: true
            })
            .click();

        console.log('💾 Save clicked');

        await this.page.waitForURL(
            '**/lightning/r/SBQQ__Quote__c/**',
            { timeout: 45000 }
        );

        console.log(
            '✅ Quote Lines saved successfully'
        );
    }

    // =========================
    // 💰 VERIFY NET TOTAL
    // =========================
    async verifyNetTotalIsNotZero() {

        const frame =
            this.page.frameLocator(
                'iframe[name^="vfFrameId_"][height="100%"]'
            );

        await this.page.waitForTimeout(5000);

        const netTotalCells =
            frame.locator(
                'div[field="SBQQ__NetTotal__c"]'
            );

        const count =
            await netTotalCells.count();

        console.log(
            `🔎 Net Total cells count → ${count}`
        );

        let finalText = null;
        let finalValue = 0;

        for (let i = 0; i < count; i++) {

            const text =
                (
                    await netTotalCells
                        .nth(i)
                        .textContent()
                )?.trim() || '';

            console.log(
                `🔎 Net Total cell[${i}] → ${text}`
            );

            const value = Number(
                text
                    .replace(/,/g, '')
                    .replace(/[^\d.]/g, '')
            );

            if (value > 0) {
                finalText = text;
                finalValue = value;
                break;
            }
        }

        if (!finalValue || finalValue <= 0) {

            throw new Error(
                '❌ Net Total invalid. No non-zero Net Total found.'
            );
        }

        console.log(
            `✅ Net Total verified → ${finalText} = ${finalValue}`
        );
    }
}

module.exports = { QLEPage };