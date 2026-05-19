// main/utilities/POManager.js

const { LoginPage } = require('../pageObjects/LoginPage');
const { OpportunityPage } = require('../pageObjects/OpportunityPage');
const { QuotePage } = require('../pageObjects/QuotePage');
const { ContactPage } = require('../pageObjects/ContactPage');
const { AccountPage } = require('../pageObjects/AccountPage');
const { QLEPage } = require('../pageObjects/QLEPage');
const { OrderPage } = require('../pageObjects/OrderPage');
const { ContractPage } = require('../pageObjects/ContractPage');
const { AmendmentPage } = require('../pageObjects/AmendmentPage');

class POManager {

    constructor(page, utilityFunctions) {
        this.page = page;
        this.utils = utilityFunctions;

        this.loginPage = new LoginPage(this.page);
        this.accountPage = new AccountPage(this.page, this.utils);
        this.opportunityPage = new OpportunityPage(this.page, this.utils);
        this.quotePage = new QuotePage(this.page, this.utils);
        this.contactPage = new ContactPage(this.page, this.utils);
        this.qlePage = new QLEPage(this.page);
        this.orderPage = new OrderPage(this.page, this.utils);
        this.contractPage = new ContractPage(this.page, this.utils);
        this.amendmentPage = new AmendmentPage(this.page, this.utils);
    }

    getLoginPage() { return this.loginPage; }
    getAccountPage() { return this.accountPage; }
    getOpportunityPage() { return this.opportunityPage; }
    getQuotePage() { return this.quotePage; }
    getContactPage() { return this.contactPage; }
    getQLEPage() { return this.qlePage; }
    getOrderPage() { return this.orderPage; }
    getContractPage() { return this.contractPage; }
    getAmendmentPage() { return this.amendmentPage; }

    async createAccountHybrid(useAPI = true) {
        return await this.accountPage.createAccount(null, useAPI);
    }

    async createOpportunityHybrid(accountId, useAPI = true) {
        return await this.opportunityPage.createOpportunity(null, useAPI, accountId);
    }

    async createQuoteHybrid(opportunityId, accountId, contactId = null, useAPI = true) {
        if (useAPI) {
            return await this.utils.createQuoteViaAPI(opportunityId, accountId, contactId);
        } else {
            return await this.quotePage.createQuote(opportunityId);
        }
    }

    async createContactHybrid(accountId, data = null, useAPI = true) {
        return await this.contactPage.createContact(accountId, data, useAPI);
    }
}

module.exports = { POManager };