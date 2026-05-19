const { test } = require('@playwright/test');
const { POManager } = require('../../main/utilities/POManager');
const { UtilityFunctions } = require('../../main/utilities/UtilityFunctions');
const testData = require('../../main/utilities/testData');

require('dotenv').config();

test.describe('Salesforce CPQ – Amendment Flow (Dynamic)', () => {

    test('E2E → Contract → Amendment → Modify Product Quantity ONLY', async ({ page }) => {

        const utils = new UtilityFunctions('CPQ_Amendment_Flow');
        const poManager = new POManager(page, utils);

        const loginPage = poManager.getLoginPage();
        const contractPage = poManager.getContractPage();
        const orderPage = poManager.getOrderPage();
        const qlePage = poManager.getQLEPage();
        const amendmentPage = poManager.getAmendmentPage();

        console.log('SF URL:', process.env.SF_INSTANCE_URL);

        const token = await utils.getAccessToken();
        await loginPage.loginWithToken(token);
        console.log('✅ Login successful');

        const accountId = await poManager.createAccountHybrid(true);
        console.log(`✅ Account → ${accountId}`);

        const contactId = await poManager.createContactHybrid(accountId, true);
        console.log(`✅ Contact → ${contactId}`);

        const opportunityId = await poManager.createOpportunityHybrid(accountId, true);
        console.log(`✅ Opportunity → ${opportunityId}`);

        const quoteId = await poManager.createQuoteHybrid(
            opportunityId,
            accountId,
            contactId,
            true
        );

        console.log(`✅ Quote → ${quoteId}`);

        await utils.setPricebookOnQuote(quoteId);

        await qlePage.openQuoteRecord(quoteId);
        await qlePage.clickEditLines();
        await qlePage.handlePricebookDialog();
        await qlePage.clickAddProducts();
        await qlePage.selectProduct();
        await qlePage.clickCalculate();
        await qlePage.saveQuoteLines();

        await utils.setQuantityOnQuoteLine(
            quoteId,
            testData.product.quantity
        );

        console.log(`✅ Initial Quantity → ${testData.product.quantity}`);

        await utils.setDiscountOnQuote(
            quoteId,
            testData.discount.withoutApproval
        );

        await utils.closeOpportunityAsWon(opportunityId);

        const orderId = await orderPage.createOrderFromQuote(quoteId);
        console.log(`✅ Order → ${orderId}`);

        await orderPage.activateOrder(orderId);

        let contractId = await contractPage.createContractFromOrder(orderId);

        if (!contractId) {
            console.log('⏳ Contract not created immediately. Waiting and checking again...');

            for (let i = 1; i <= 6; i++) {
                await page.waitForTimeout(5000);

                const contractResult = await utils.apiRequest(
                    'get',
                    `query?q=SELECT+Id,ContractNumber+FROM+Contract+WHERE+SBQQ__Order__c='${orderId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`
                );

                if (contractResult.records?.length) {
                    contractId = contractResult.records[0].Id;
                    console.log(`✅ Contract found on retry ${i} → ${contractId}`);
                    break;
                }

                console.log(`⏳ Still waiting for Contract... attempt ${i}/6`);
            }
        }

        if (!contractId) {
            throw new Error('❌ Contract not created');
        }

        console.log(`✅ Contract → ${contractId}`);

        await page.waitForTimeout(8000);

        await contractPage.openContractRecord(contractId);

        await amendmentPage.startAmendment(contractPage);

        const amendQuoteId =
            await amendmentPage.getAmendmentQuoteId(accountId, quoteId);

        console.log(`🆕 Amendment Quote → ${amendQuoteId}`);

        await utils.setPricebookOnQuote(amendQuoteId);
        console.log('✅ Pricebook set on Amendment Quote via API');

        await page.waitForTimeout(5000);

        await utils.updateAmendmentQuoteLineQuantity(
            amendQuoteId,
            testData.product.amendmentQuantity
        );

        console.log(`✅ Amendment Quantity updated via API → ${testData.product.amendmentQuantity}`);

        await qlePage.openQuoteRecord(amendQuoteId);
        await qlePage.clickEditLines();

        await page.waitForSelector(
            'iframe[name^="vfFrameId_"][height="100%"]',
            { timeout: 60000 }
        );

        await page.waitForTimeout(5000);

        await qlePage.clickCalculate();

        await qlePage.verifyNetTotalIsNotZero();

        await qlePage.saveQuoteLines();

        console.log('🎉 Amendment flow completed successfully');
    });
});