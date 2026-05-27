require('dotenv').config();
const axios = require('axios');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const testData = require('./testData');

class UtilityFunctions {

    constructor(TestCaseName) {
        this.TestCaseName = TestCaseName;
        this.accessToken = null;
        this.instanceUrl = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');

        const jwtToken = jwt.sign(
            {
                iss: process.env.SF_CLIENT_ID,
                sub: process.env.SF_USERNAME,
                aud: process.env.SF_LOGIN_URL
            },
            privateKey,
            { algorithm: 'RS256', expiresIn: '3m' }
        );

        const res = await axios.post(
            `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
            null,
            {
                params: {
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: jwtToken
                }
            }
        );

        this.accessToken = res.data.access_token;
        this.instanceUrl = res.data.instance_url;
        this.tokenExpiry = new Date(Date.now() + 2 * 60 * 1000);

        return this.accessToken;
    }

    async apiRequest(method, endpoint, data = null) {
        const token = await this.getAccessToken();

        try {
            const res = await axios({
                method,
                url: `${this.instanceUrl}/services/data/v57.0/${endpoint}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data
            });

            return res.data;
        } catch (err) {
            console.error('❌ API Request Failed:', err.response?.data || err.message);
            throw err;
        }
    }

    // =========================
    // 🏢 ACCOUNT
    // =========================
    async createAccountViaAPI() {
        const street = faker.location.streetAddress();
        const city = faker.location.city();
        const state = faker.location.state();
        const zip = faker.location.zipCode();
        const country = 'India';
        const phone = `+91${faker.string.numeric(10)}`;

        const res = await this.apiRequest(
            'post',
            'sobjects/Account',
            {
                Name: `${testData.account.namePrefix}_${faker.number.int({ min: 1000, max: 9999 })}`,
                Phone: phone,
                BillingStreet: street,
                BillingCity: city,
                BillingState: state,
                BillingPostalCode: zip,
                BillingCountry: country,
                ShippingStreet: street,
                ShippingCity: city,
                ShippingState: state,
                ShippingPostalCode: zip,
                ShippingCountry: country
            }
        );
        return res.id;
    }

    // =========================
    // 👤 CONTACT
    // =========================
    async createContactViaAPI(accountId, data = {}) {
        if (!accountId) throw new Error('accountId required');

        const account = await this.apiRequest(
            'get',
            `sobjects/Account/${accountId}?fields=BillingStreet,BillingCity,BillingState,BillingPostalCode,BillingCountry,Phone`
        );

        const contactData = {
            Salutation: testData.contact.salutation,
            LastName: faker.person.lastName(),
            Email: faker.internet.email(),
            Phone: account.Phone,
            MailingStreet: account.BillingStreet,
            MailingCity: account.BillingCity,
            MailingState: account.BillingState,
            MailingPostalCode: account.BillingPostalCode,
            MailingCountry: account.BillingCountry,
            ...data,
            AccountId: accountId
        };

        const res = await this.apiRequest('post', 'sobjects/Contact', contactData);
        return res.id;
    }

    async createOpportunityViaAPI(accountId) {
        const res = await this.apiRequest(
            'post',
            'sobjects/Opportunity',
            {
                Name: `Opp_${faker.number.int({ min: 1000, max: 9999 })}`,
                StageName: testData.opportunity.stage,
                CloseDate: new Date().toISOString().split('T')[0],
                AccountId: accountId
            }
        );

        return res.id;
    }

    async closeOpportunityAsWon(opportunityId) {
        await this.apiRequest(
            'patch',
            `sobjects/Opportunity/${opportunityId}`,
            {
                StageName: 'Closed Won',
                CloseDate: new Date().toISOString().split('T')[0]
            }
        );

        console.log(`✅ Opportunity marked as Closed Won`);
    }

    async createQuoteViaAPI(opportunityId, accountId, contactId = null, data = null) {
        if (!opportunityId || !accountId) {
            throw new Error('opportunityId & accountId required');
        }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + testData.subscriptionTerm);

        const quoteData = {
            SBQQ__Opportunity2__c: opportunityId,
            SBQQ__Account__c: accountId,
            SBQQ__Primary__c: true,
            SBQQ__SubscriptionTerm__c: testData.subscriptionTerm,
            SBQQ__StartDate__c: startDate.toISOString().split('T')[0],
            SBQQ__EndDate__c: endDate.toISOString().split('T')[0],
            ...data
        };

        if (contactId) {
            quoteData.SBQQ__PrimaryContact__c = contactId;
        }

        const result = await this.apiRequest(
            'post',
            'sobjects/SBQQ__Quote__c/',
            quoteData
        );

        return result.id;
    }

    async setPricebookOnQuote(quoteId, pricebookName = testData.pricebook.name) {
        const encodedName = encodeURIComponent(pricebookName);
        const query = `SELECT+Id+FROM+Pricebook2+WHERE+Name='${encodedName}'+LIMIT+1`;

        const pbResult = await this.apiRequest('get', `query?q=${query}`);

        if (!pbResult.records?.length) {
            throw new Error(`❌ Pricebook not found: ${pricebookName}`);
        }

        const pricebookId = pbResult.records[0].Id;

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            { SBQQ__PricebookId__c: pricebookId }
        );

        console.log(`✅ Pricebook set: ${pricebookName}`);
    }

    async setDiscountOnQuote(quoteId, discountPercent = testData.discount) {
        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            { SBQQ__CustomerDiscount__c: discountPercent }
        );

        console.log(`✅ Discount set: ${discountPercent}%`);
    }

    async setQuantityOnQuoteLine(quoteId, quantity = testData.product.quantity) {
        if (quantity <= 1) return;

        const result = await this.apiRequest(
            'get',
            `query?q=SELECT+Id+FROM+SBQQ__QuoteLine__c+WHERE+SBQQ__Quote__c='${quoteId}'+LIMIT+1`
        );

        if (!result.records?.length) {
            throw new Error('❌ Quote Line not found');
        }

        const quoteLineId = result.records[0].Id;

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__QuoteLine__c/${quoteLineId}`,
            { SBQQ__Quantity__c: quantity }
        );

        console.log(`✅ Quantity set via API: ${quantity}`);
    }

    async updateAmendmentQuoteLineQuantity(quoteId, quantity) {
        const result = await this.apiRequest(
            'get',
            `query?q=SELECT+Id+FROM+SBQQ__QuoteLine__c+WHERE+SBQQ__Quote__c='${quoteId}'+LIMIT+1`
        );

        if (!result.records?.length) {
            throw new Error('❌ Amendment Quote Line not found');
        }

        const quoteLineId = result.records[0].Id;

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__QuoteLine__c/${quoteLineId}`,
            { SBQQ__Quantity__c: quantity }
        );

        console.log(`✅ Amendment Quote Line quantity updated → ${quantity}`);
    }

    async updateAmendmentQuoteLineQuantityAndStartDate(quoteId, quantity, startDate) {
        const result = await this.apiRequest(
            'get',
            `query?q=SELECT+Id+FROM+SBQQ__QuoteLine__c+WHERE+SBQQ__Quote__c='${quoteId}'+LIMIT+1`
        );

        if (!result.records?.length) {
            throw new Error('❌ Amendment Quote Line not found');
        }

        const quoteLineId = result.records[0].Id;

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__QuoteLine__c/${quoteLineId}`,
            {
                SBQQ__Quantity__c: quantity,
                SBQQ__StartDate__c: startDate
            }
        );

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            { SBQQ__StartDate__c: startDate }
        );

        console.log(`✅ Amendment Quote Line updated → Qty: ${quantity}, Start Date: ${startDate}`);
        console.log(`✅ Amendment Quote Start Date also updated → ${startDate}`);
    }

    async submitQuoteForApproval(quoteId) {
        const result = await this.apiRequest(
            'post',
            'process/approvals',
            {
                requests: [{
                    actionType: 'Submit',
                    contextId: quoteId,
                    comments: 'Submitting for approval via automation'
                }]
            }
        );

        console.log(`✅ Quote submitted for approval`);
        return result;
    }

    async getApprovalWorkitemId(quoteId, retries = 10, waitMs = 3000) {
        for (let i = 0; i < retries; i++) {
            const result = await this.apiRequest(
                'get',
                `query?q=SELECT+Id+FROM+ProcessInstanceWorkitem+WHERE+ProcessInstance.TargetObjectId='${quoteId}'+LIMIT+1`
            );

            if (result.records?.length > 0) {
                const workitemId = result.records[0].Id;
                console.log(`✅ Approval workitem found: ${workitemId}`);
                return workitemId;
            }

            console.log(`⏳ Waiting for workitem... attempt ${i + 1}/${retries}`);
            await new Promise(r => setTimeout(r, waitMs));
        }

        throw new Error('❌ Approval workitem not found after retries');
    }

    async approveQuote(workitemId) {
        await this.apiRequest(
            'post',
            'process/approvals',
            {
                requests: [{
                    actionType: 'Approve',
                    contextId: workitemId,
                    comments: 'Approved via automation'
                }]
            }
        );

        console.log(`✅ Quote approved!`);
    }

    async createOrderFromQuote(quoteId) {
        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            { SBQQ__Ordered__c: true }
        );

        console.log(`✅ Quote marked as Ordered`);

        await new Promise(r => setTimeout(r, 3000));

        const result = await this.apiRequest(
            'get',
            `query?q=SELECT+Id,OrderNumber+FROM+Order+WHERE+SBQQ__Quote__c='${quoteId}'+LIMIT+1`
        );

        if (!result.records?.length) {
            throw new Error('❌ Order not found');
        }

        const orderId = result.records[0].Id;

        console.log(
            `✅ Order created → ID: ${orderId} | Number: ${result.records[0].OrderNumber}`
        );

        return orderId;
    }

    async activateOrder(orderId) {
        await this.apiRequest(
            'patch',
            `sobjects/Order/${orderId}`,
            { Status: 'Activated' }
        );

        console.log(`✅ Order activated!`);
    }

    async createContractFromOrder(orderId) {
        await this.apiRequest(
            'patch',
            `sobjects/Order/${orderId}`,
            { SBQQ__Contracted__c: true }
        );

        console.log(`✅ Contract generation triggered`);

        await new Promise(r => setTimeout(r, 5000));

        const result = await this.apiRequest(
            'get',
            `query?q=SELECT+Id,ContractNumber+FROM+Contract+WHERE+SBQQ__Order__c='${orderId}'+LIMIT+1`
        );

        if (!result.records?.length) {
            console.log(`ℹ️ Contract not generated yet`);
            return null;
        }

        const contractId = result.records[0].Id;

        console.log(
            `✅ Contract → ID: ${contractId} | Number: ${result.records[0].ContractNumber}`
        );

        return contractId;
    }

    async prepareAmendmentForOrdering(quoteId, startDate, pricebookName = testData.pricebook.name) {

        const pbResult = await this.apiRequest(
            'get',
            `query?q=SELECT+Id+FROM+Pricebook2+WHERE+Name='${encodeURIComponent(pricebookName)}'+LIMIT+1`
        );

        if (!pbResult.records?.length) {
            throw new Error(`❌ Pricebook not found: ${pricebookName}`);
        }

        const pricebookId = pbResult.records[0].Id;
        console.log(`🔍 Pricebook found: ${pricebookId}`);

        const lineResult = await this.apiRequest(
            'get',
            `query?q=SELECT+Id,SBQQ__Product__c+FROM+SBQQ__QuoteLine__c+WHERE+SBQQ__Quote__c='${quoteId}'+LIMIT+1`
        );

        if (!lineResult.records?.length) {
            throw new Error('❌ Amendment Quote Line not found');
        }

        const quoteLineId = lineResult.records[0].Id;
        const productId = lineResult.records[0].SBQQ__Product__c;
        console.log(`🔍 Quote Line: ${quoteLineId} | Product: ${productId}`);

        const pbeResult = await this.apiRequest(
            'get',
            `query?q=SELECT+Id+FROM+PricebookEntry+WHERE+Product2Id='${productId}'+AND+Pricebook2Id='${pricebookId}'+AND+IsActive=true+LIMIT+1`
        );

        if (!pbeResult.records?.length) {
            throw new Error(`❌ PricebookEntry not found for Product: ${productId}`);
        }

        const pricebookEntryId = pbeResult.records[0].Id;
        console.log(`🔍 PricebookEntry found: ${pricebookEntryId}`);

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__QuoteLine__c/${quoteLineId}`,
            {
                SBQQ__PricebookEntryId__c: pricebookEntryId,
                SBQQ__StartDate__c: startDate
            }
        );
        console.log(`✅ PricebookEntryId + StartDate patched on Quote Line`);

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            {
                SBQQ__PricebookId__c: pricebookId,
                SBQQ__StartDate__c: startDate
            }
        );
        console.log(`✅ Pricebook2Id + StartDate patched on Amendment Quote`);

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            { SBQQ__Ordered__c: true }
        );
        console.log(`✅ Amendment Quote marked as Ordered`);

        await new Promise(r => setTimeout(r, 8000));

        const orderResult = await this.apiRequest(
            'get',
            `query?q=SELECT+Id,OrderNumber+FROM+Order+WHERE+SBQQ__Quote__c='${quoteId}'+LIMIT+1`
        );

        if (!orderResult.records?.length) {
            throw new Error('❌ Amended Order not found after Ordered = true');
        }

        const orderId = orderResult.records[0].Id;
        console.log(`✅ Amended Order → ID: ${orderId} | Number: ${orderResult.records[0].OrderNumber}`);

        await this.apiRequest(
            'patch',
            `sobjects/Order/${orderId}`,
            {
                Pricebook2Id: pricebookId,
                EffectiveDate: startDate
            }
        );
        console.log(`✅ Pricebook2Id + EffectiveDate(StartDate) patched on Amended Order`);

        return orderId;
    }
}

module.exports = { UtilityFunctions };