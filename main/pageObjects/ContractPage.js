class ContractPage {
    constructor(page, utilityFunctions) {
        this.page = page;
        this.utils = utilityFunctions;
    }

    async createContractFromOrder(orderId) {
        return await this.utils.createContractFromOrder(orderId);
    }

    // =========================
    // 📄 OPEN CONTRACT RECORD
    // =========================
    async openContractRecord(contractId) {
        const url = `${process.env.SF_INSTANCE_URL}/lightning/r/Contract/${contractId}/view`;
        console.log(`🌐 Opening Contract: ${url}`);

        await this.page.goto(url);
        await this.page.waitForURL('**/lightning/r/Contract/**', { timeout: 30000 });

        console.log('✅ Contract page loaded');
    }

    // =========================
    // ✏️ FIRST AMEND (CONTRACT PAGE)
    // =========================
    async clickAmend() {
        const amendBtn = this.page.getByRole('button', { name: 'Amend', exact: true });

        await amendBtn.scrollIntoViewIfNeeded();
        await amendBtn.waitFor({ state: 'visible', timeout: 20000 });
        await amendBtn.click({ force: true });

        console.log('🖱️ First Amend clicked');

        await this.page.waitForTimeout(5000);
    }

    // =========================
    // ✏️ SECOND AMEND (AMEND CONTRACT VF PAGE)
    // =========================
    async clickSecondAmend() {
        console.log('⏳ Waiting for Amend Contract VF iframe...');

        await this.page.waitForSelector(
            'iframe[name^="vfFrameId_"]',
            { timeout: 30000 }
        );

        const frame = this.page.frameLocator(
            'iframe[name^="vfFrameId_"]'
        );

        console.log('✅ Amend Contract VF iframe detected');

        const amendBtn = frame.locator(
            'input.sbBtn[type="submit"][value="Amend"]'
        );

        await amendBtn.waitFor({
            state: 'visible',
            timeout: 30000
        });

        console.log('✅ Second Amend button visible');

        await amendBtn.click();

        console.log('🖱️ Second Amend clicked');

        await this.page.waitForSelector(
            'iframe[name^="vfFrameId_"][height="100%"]',
            { timeout: 60000 }
        );

        console.log('✅ QLE iframe loaded after Amendment');
    }
}

module.exports = { ContractPage };