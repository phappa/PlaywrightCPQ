const { test } = require('@playwright/test');
const { POManager } = require('../../main/utilities/POManager');
const { UtilityFunctions } = require('../../main/utilities/UtilityFunctions');
const testData = require('../../main/utilities/testData');

require('dotenv').config();

test.describe('Salesforce CPQ – Amendment Flow (Dynamic)', () => {

    test('E2E → Contract → Amendment → Modify Product Quantity + Start Date', async ({ page }) => {
        const utils = new UtilityFunctions('CPQ_Amendment_Flow');
        const poManager = new POManager(page, utils);

        const loginPage     = poManager.getLoginPage();
        const contractPage  = poManager.getContractPage();
        const orderPage     = poManager.getOrderPage();
        const qlePage       = poManager.getQLEPage();
        const amendmentPage = poManager.getAmendmentPage();

        console.log('SF URL:', process.env.SF_INSTANCE_URL);

        // ── 1. Login ──────────────────────────────────────────────────────────────
        const token = await utils.getAccessToken();
        await loginPage.loginWithToken(token);
        console.log('✅ Login successful');

        // ── 2. Data Setup ─────────────────────────────────────────────────────────
        const accountId     = await poManager.createAccountHybrid(true);
        const contactId     = await poManager.createContactHybrid(accountId, true);
        const opportunityId = await poManager.createOpportunityHybrid(accountId, true);
        const quoteId       = await poManager.createQuoteHybrid(opportunityId, accountId, contactId, true);

        console.log(`✅ Account     → ${accountId}`);
        console.log(`✅ Contact     → ${contactId}`);
        console.log(`✅ Opportunity → ${opportunityId}`);
        console.log(`✅ Quote       → ${quoteId}`);

        // ── 3. Original Quote — Pricebook + QLE ──────────────────────────────────
        await utils.setPricebookOnQuote(quoteId);

        await qlePage.openQuoteRecord(quoteId);
        await qlePage.clickEditLines();
        //await qlePage.handlePricebookDialog();
        await qlePage.clickAddProducts();
        await qlePage.selectProduct();
        await qlePage.clickCalculate();
        await qlePage.saveQuoteLines();

        // ── 4. Original Quote — API updates ──────────────────────────────────────
        await utils.setQuantityOnQuoteLine(quoteId, testData.product.quantity);
        console.log(`✅ Initial Quantity → ${testData.product.quantity}`);

        await utils.setDiscountOnQuote(quoteId, testData.discount.withoutApproval);

        // ── 5. Close Opp → Order → Activate → Contract ───────────────────────────
        await utils.closeOpportunityAsWon(opportunityId);

        const orderId = await orderPage.createOrderFromQuote(quoteId);
        console.log(`✅ Order → ${orderId}`);

        await orderPage.activateOrder(orderId);

        let contractId = await contractPage.createContractFromOrder(orderId);

        if (!contractId) {
            console.log('⏳ Contract not immediate — polling...');
            for (let i = 1; i <= 6; i++) {
                await page.waitForTimeout(5000);
                const res = await utils.apiRequest(
                    'get',
                    `query?q=SELECT+Id,ContractNumber+FROM+Contract+WHERE+SBQQ__Order__c='${orderId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`
                );
                if (res.records?.length) {
                    contractId = res.records[0].Id;
                    console.log(`✅ Contract found on retry ${i} → ${contractId}`);
                    break;
                }
    console.log(`⏳ Waiting for Contract... attempt ${i}/6`);
            }
        }

        if (!contractId) throw new Error('❌ Contract not created after retries');
        console.log(`✅ Contract → ${contractId}`);

        // ── 6. Open Contract → Start Amendment ───────────────────────────────────
        await page.waitForTimeout(8000);
        await contractPage.openContractRecord(contractId);
        await amendmentPage.startAmendment(contractPage);

        // ── 7. Fetch Amendment Quote ID ───────────────────────────────────────────
        const amendQuoteId = await amendmentPage.getAmendmentQuoteId(accountId, quoteId);
        console.log(`🆕 Amendment Quote → ${amendQuoteId}`);

        // ── 8. API: Update Quantity + Start Date BEFORE Calculate ─────────────────
        await page.waitForTimeout(5000);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 35);
        const amendmentStartDate = startDate.toISOString().split('T')[0];

        await utils.updateAmendmentQuoteLineQuantityAndStartDate(
            amendQuoteId,
            testData.product.amendmentQuantity,
            amendmentStartDate
        );

        console.log(`✅ Amendment Quantity  → ${testData.product.amendmentQuantity}`);
        console.log(`✅ Amendment StartDate → ${amendmentStartDate}`);

        // ── 9. Calculate → auto-save → redirect to Amendment Quote page ──────────
        await qlePage.clickCalculate();

        await page.waitForURL(
            '**/lightning/r/SBQQ__Quote__c/*/view*',
            { timeout: 60000 }
        );

        console.log('✅ Amendment QLE saved — on Amendment Quote record page');

        // ── 10. Fix Pricebook on everything + Ordered = true → Amended Order ──────
        // prepareAmendmentForOrdering():
        //   - Quote Line pe PricebookEntryId patch
        //   - Amendment Quote pe Pricebook2Id patch
        //   - SBQQ__Ordered__c = true
        //   - Order fetch
        //   - Order pe Pricebook2Id patch
        const amendedOrderId = await utils.prepareAmendmentForOrdering(amendQuoteId, amendmentStartDate);

        console.log(`✅ Amended Order → ${amendedOrderId}`);

        // ── 11. Activate Amended Order ────────────────────────────────────────────
        await utils.activateOrder(amendedOrderId);
        console.log('✅ Amended Order activated');

        // ── 12. Contracted = true → triggers new Contract ─────────────────────────
       // ── 12. Contracted = true → triggers new Contract ─────────────────────────
let amendedContractId = await utils.createContractFromOrder(amendedOrderId);

if (!amendedContractId) {
    console.log('⏳ Amended Contract not immediate — polling...');
    for (let i = 1; i <= 6; i++) {
        await page.waitForTimeout(5000);
        const res = await utils.apiRequest(
            'get',
            `query?q=SELECT+Id,ContractNumber+FROM+Contract+WHERE+SBQQ__Order__c='${amendedOrderId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`
        );
        if (res.records?.length) {
            amendedContractId = res.records[0].Id;
            console.log(`✅ Amended Contract found on retry ${i} → ${amendedContractId}`);
            break;
        }
        console.log(`⏳ Waiting for Amended Contract... attempt ${i}/6`);
    }
}

if (!amendedContractId) throw new Error('❌ Amended Contract not created after retries');

// ✅ Contract pe StartDate patch karo
// StartDate = Contract Start Date ka actual API field name
await utils.apiRequest(
    'patch',
    `sobjects/Contract/${amendedContractId}`,
    { StartDate: amendmentStartDate }
);
console.log(`✅ StartDate patched on Amended Contract → ${amendmentStartDate}`);

console.log(`✅ Amended Contract → ${amendedContractId}`);
console.log('🎉 Amendment flow completed successfully!');
    });
});