class AmendmentPage {
    constructor(page, utils) {
        this.page = page;
        this.utils = utils;
    }

    async startAmendment(contractPage) {
        await contractPage.clickAmend();
        await contractPage.clickSecondAmend();
    }

    // 🔥 Get Amendment Quote ID via Account
    // Original quote ko exclude karenge
    async getAmendmentQuoteId(accountId, originalQuoteId) {

        for (let i = 1; i <= 20; i++) {

            const query = `
                SELECT Id, Name, CreatedDate, SBQQ__Primary__c, SBQQ__Opportunity2__c, SBQQ__Account__c
                FROM SBQQ__Quote__c
                WHERE SBQQ__Account__c = '${accountId}'
                AND Id != '${originalQuoteId}'
                ORDER BY CreatedDate DESC
                LIMIT 1
            `;

            const result = await this.utils.apiRequest(
                'get',
                `query?q=${encodeURIComponent(query)}`
            );

            if (result.records?.length > 0) {
                const quoteId = result.records[0].Id;
                console.log(`🆕 Amendment Quote: ${quoteId}`);
                return quoteId;
            }

            console.log(`⏳ Waiting for Amendment Quote... attempt ${i}/20`);
            await new Promise(r => setTimeout(r, 3000));
        }

        throw new Error('❌ Amendment Quote not found');
    }
}

module.exports = { AmendmentPage };