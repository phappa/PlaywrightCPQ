// main/utilities/testData.js

module.exports = {

    // =========================
    // 🛒 SIMPLE PRODUCT
    // =========================
    product: {

        code: process.env.PRODUCT_CODE || '10KWHBATTERY',
        quantity: parseInt(process.env.PRODUCT_QUANTITY) || 1,
        amendmentQuantity: Number(process.env.AMENDMENT_PRODUCT_QUANTITY || 7),

        code: process.env.PRODUCT_CODE || 'CLOUDSTORAGE',
        quantity: parseInt(process.env.PRODUCT_QUANTITY) || 1

    },

    // =========================
    // 📦 BUNDLE PRODUCTS
    // =========================
    activeBundleCode: process.env.BUNDLE_PRODUCT_CODE || 'LAPTOP13',

    bundles: {
        LAPTOP13: {
            productCode: 'LAPTOP13',
            options: [
                { productCode: 'CPU16GHZI5', selectionType: 'radio' },
                { productCode: 'RAM16GB', selectionType: 'radio' },
                { productCode: 'SSD128', selectionType: 'radio' }
            ]
        },
        LAPTOP15: {
              productCode: 'LAPTOP15',
          options: [
        { productCode: 'CPU25GHZI7', selectionType: 'radio' },
        { productCode: 'RAM16GB', selectionType: 'radio' },
        { productCode: 'SSD512', selectionType: 'radio' }
         ]
        },
        
        SMARTPHONE6: {
            productCode: 'SMARTPHONE6',
            options: [
                { productCode: 'SMARTPHONEFASTCHARGER', selectionType: 'checkbox' },
                { productCode: 'SMARTPHONEACTIVATION', selectionType: 'checkbox' },
                { productCode: 'USBCCHARGE2M', selectionType: 'checkbox' },
                { productCode: 'SMARTPHONEHEAVYDUTYCASE', selectionType: 'checkbox' }
            ]
        } ,            
    },

    // =========================
    // 💰 DISCOUNT
    // =========================
    discount: {
        withApproval: parseFloat(process.env.DISCOUNT_WITH_APPROVAL) || 20,
        withoutApproval: parseFloat(process.env.DISCOUNT_WITHOUT_APPROVAL) || 18
    },

    // =========================
    // 📅 SUBSCRIPTION
    // =========================
    subscriptionTerm: parseInt(process.env.SUBSCRIPTION_TERM) || 12,

    // =========================
    // 📚 PRICEBOOK
    // =========================
    pricebook: {
        name: process.env.PRICEBOOK_NAME || 'Standard Price Book'
    },

    // =========================
    // 🏢 ACCOUNT
    // =========================
    account: {
        namePrefix: 'Account'
    },

    // =========================
    // 👤 CONTACT
    // =========================
    contact: {
        salutation: 'Mr.'
    },

    // =========================
    // 💼 OPPORTUNITY
    // =========================
    opportunity: {
        stage: 'Prospecting'
    }
};