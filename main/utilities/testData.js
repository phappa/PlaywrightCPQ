// main/utilities/testData.js

module.exports = {
    product: {
        code: process.env.PRODUCT_CODE || '10KWHBATTERY',
        quantity: parseInt(process.env.PRODUCT_QUANTITY) || 1,
        amendmentQuantity: Number(process.env.AMENDMENT_PRODUCT_QUANTITY || 7)
    },
    discount: {
        withApproval: parseFloat(process.env.DISCOUNT_WITH_APPROVAL) || 20,
        withoutApproval: parseFloat(process.env.DISCOUNT_WITHOUT_APPROVAL) || 10
    },
    subscriptionTerm: parseInt(process.env.SUBSCRIPTION_TERM) || 12,
    pricebook: {
        name: process.env.PRICEBOOK_NAME || 'Standard Price Book'
    },
    account: {
        namePrefix: 'Account'
    },
    contact: {
        salutation: 'Mr.'
    },
    opportunity: {
        stage: 'Prospecting'
    }
};