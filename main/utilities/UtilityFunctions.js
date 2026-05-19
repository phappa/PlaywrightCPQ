// =========================
// UtilityFunctions.js
// =========================

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

    async createAccountViaAPI() {
        const res = await this.apiRequest(
            'post',
            'sobjects/Account',
            {
                Name: `${testData.account.namePrefix}_${faker.number.int({
                    min: 1000,
                    max: 9999
                })}`
            }
        );

        return res.id;
    }

    async createContactViaAPI(accountId, data = {}) {
        if (!accountId) throw new Error('accountId required');

        const contactData = {
            Salutation: testData.contact.salutation,
            LastName: faker.person.lastName(),
            ...data,
            AccountId: accountId
        };

        const res = await this.apiRequest(
            'post',
            'sobjects/Contact',
            contactData
        );

        return res.id;
    }

    async createOpportunityViaAPI(accountId) {
        const res = await this.apiRequest(
            'post',
            'sobjects/Opportunity',
            {
                Name: `Opp_${faker.number.int({
                    min: 1000,
                    max: 9999
                })}`,
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

        const query =
            `SELECT+Id+FROM+Pricebook2+WHERE+Name='${encodedName}'+LIMIT+1`;

        const pbResult = await this.apiRequest(
            'get',
            `query?q=${query}`
        );

        if (!pbResult.records?.length) {
            throw new Error(`❌ Pricebook not found: ${pricebookName}`);
        }

        const pricebookId = pbResult.records[0].Id;

        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            {
                SBQQ__PricebookId__c: pricebookId
            }
        );

        console.log(`✅ Pricebook set: ${pricebookName}`);
    }

    async setDiscountOnQuote(quoteId, discountPercent = testData.discount) {
        await this.apiRequest(
            'patch',
            `sobjects/SBQQ__Quote__c/${quoteId}`,
            {
                SBQQ__CustomerDiscount__c: discountPercent
            }
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
            {
                SBQQ__Quantity__c: quantity
            }
        );

        console.log(`✅ Quantity set via API: ${quantity}`);
    }

    // =========================
    // ✏️ UPDATE AMENDMENT QUOTE LINE QUANTITY ONLY
    // =========================
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
            {
                SBQQ__Quantity__c: quantity
            }
        );

        console.log(`✅ Amendment Quote Line quantity updated → ${quantity}`);
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
            {
                SBQQ__Ordered__c: true
            }
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
            {
                Status: 'Activated'
            }
        );

        console.log(`✅ Order activated!`);
    }

    async createContractFromOrder(orderId) {
        await this.apiRequest(
            'patch',
            `sobjects/Order/${orderId}`,
            {
                SBQQ__Contracted__c: true
            }
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
}

module.exports = { UtilityFunctions };