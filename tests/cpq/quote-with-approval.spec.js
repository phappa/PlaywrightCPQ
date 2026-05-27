// tests/cpq/quote-with-approval.spec.js


const { test } = require('@playwright/test');
const { POManager } = require('../../main/utilities/POManager');
const { UtilityFunctions } = require('../../main/utilities/UtilityFunctions');
const testData = require('../../main/utilities/testData');

test.describe('Salesforce CPQ – E2E Flow', () => {

    test('Account → Contact → Opportunity → Quote → Product → Approval → Order → Contract', async ({ page }) => {

        const utils = new UtilityFunctions('CPQ_E2E_Flow');
        const poManager = new POManager(page, utils);

        // =========================
        // 🔐 LOGIN
        // =========================
        const loginPage = poManager.getLoginPage();
        const accessToken = await utils.getAccessToken();
        await loginPage.loginWithToken(accessToken);
        console.log('✅ Login successful');

        // =========================
        // 🏢 ACCOUNT
        // =========================
        const accountId = await poManager.createAccountHybrid(true);
        console.log(`✅ Account created → ID: ${accountId}`);

        // =========================
        // 👤 CONTACT
        // =========================
        
        const contactId = await poManager.createContactHybrid(accountId, true);
        console.log(`✅ Contact created → ID: ${contactId}`);

        const contactInfo = await utils.apiRequest(
            'get',
            `sobjects/Contact/${contactId}?fields=Id,AccountId,LastName`
        );
        if (contactInfo.AccountId === accountId) {
            console.log('🔗 Contact correctly linked to Account');
        } else {
            console.warn('⚠️ Contact not linked to Account!');
        }

        // =========================
        // 💼 OPPORTUNITY
        // =========================
        const opportunityId = await poManager.createOpportunityHybrid(accountId, true);
        console.log(`✅ Opportunity created → ID: ${opportunityId}`);

        // =========================
        // 📝 QUOTE
        // =========================
        const quoteId = await poManager.createQuoteHybrid(
            opportunityId,
            accountId,
            contactId,
            true
        );
        console.log(`✅ Quote created → ID: ${quoteId}`);

        await utils.setPricebookOnQuote(quoteId);
        console.log('🎉 Phase 1 Complete — API flow done!');

        // =========================
        // 🖥️ PHASE 2 — QLE UI
        // =========================
        const qlePage = poManager.getQLEPage();
        const orderPage = poManager.getOrderPage();
        const contractPage = poManager.getContractPage();

        await qlePage.openQuoteRecord(quoteId);
        await qlePage.clickEditLines();
        await qlePage.handlePricebookDialog();
        await qlePage.clickAddProducts();
        await qlePage.selectProduct();
        await qlePage.clickCalculate();
        await qlePage.saveQuoteLines();
        // 🆕 Quantity API se set karo — save ke baad
       await utils.setQuantityOnQuoteLine(quoteId, testData.product.quantity);
        console.log('🎉 Phase 2 Complete — Product added, priced, and saved!');

        // =========================
        // 🆕 PHASE 3 — DISCOUNT + APPROVAL + ORDER
        // =========================

        // 3.1 Discount set karo
       await utils.setDiscountOnQuote(quoteId, testData.discount.withApproval);

        // 3.2 Submit for approval
        await utils.submitQuoteForApproval(quoteId);

        // 3.3 Workitem ka wait
        const workitemId = await utils.getApprovalWorkitemId(quoteId);

        // 3.4 Approve
        await utils.approveQuote(workitemId);

        // 3.5 Order create — OrderPage se
        const orderId = await orderPage.createOrderFromQuote(quoteId);
        console.log(`✅ Order created → ID: ${orderId}`);

        // 3.6 Order activate — OrderPage se
        await orderPage.activateOrder(orderId);

        // 3.7 Contract — ContractPage se
        const contractId = await contractPage.createContractFromOrder(orderId);
        if (contractId) {
            console.log(`✅ Contract created → ID: ${contractId}`);
        }

        console.log('🎉 Phase 3 Complete — Discount → Approval → Order → Activated!');
    });
});
