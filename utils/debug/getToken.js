require('dotenv').config();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const fetch = global.fetch || require('node-fetch'); // Node 25 me fetch built-in

// Read private key
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');

// Generate JWT
const token = jwt.sign(
  {
    iss: process.env.SF_CLIENT_ID, // Connected App Consumer Key
    sub: process.env.SF_USERNAME,  // API user email
    aud: process.env.SF_LOGIN_URL, // Salesforce login URL
  },
  privateKey,
  { algorithm: 'RS256', expiresIn: '3m' } // 3 min valid
);

console.log('🔹 Generated JWT:', token);

async function getAccessToken() {
  try {
    const res = await fetch(`${process.env.SF_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      }),
    });

    const data = await res.json();
    console.log('🔹 Salesforce Response:', data);

    if (data.access_token) {
      console.log('✅ Access Token:', data.access_token);
      console.log('✅ Instance URL:', data.instance_url);
    } else {
      console.error('❌ Token fetch failed');
    }
  } catch (err) {
    console.error('⚠️ Network/Script error:', err);
  }
}

getAccessToken();









 