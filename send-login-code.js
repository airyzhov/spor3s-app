// Sends a login code to the specified phone using GramJS, stores phoneCodeHash to a temp file.
// Usage:
//   TELEGRAM_PHONE=+79785297149 node send-login-code.js
// Requires TELEGRAM_API_ID and TELEGRAM_API_HASH in spor3s-app/spor3s-app/env.local

const fs = require('fs');
const path = require('path');
let dotenv;
try {
  // Load dotenv from the inner app if available
  dotenv = require('./spor3s-app/spor3s-app/node_modules/dotenv');
} catch (e) {
  dotenv = null;
}
// Require telegram from the inner project to ensure dependency exists
const { createRequire } = require('module');
const appRequire = createRequire(path.join(__dirname, 'spor3s-app', 'spor3s-app', 'package.json'));
const { TelegramClient } = appRequire('telegram');
const { StringSession } = appRequire('telegram/sessions');
const { Api } = appRequire('telegram');

(async () => {
  // Load env from inner app env.local
  if (dotenv) {
    dotenv.config({ path: path.join(__dirname, 'spor3s-app', 'spor3s-app', 'env.local') });
  } else {
    // Fallback: parse env.local manually
    const envPath = path.join(__dirname, 'spor3s-app', 'spor3s-app', 'env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (m) process.env[m[1]] = m[2];
      }
    }
  }

  const apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const phoneNumber = process.env.TELEGRAM_PHONE || process.env.PHONE || '';

  if (!apiId || !apiHash) {
    console.error('[ERROR] TELEGRAM_API_ID or TELEGRAM_API_HASH is not set in env.local');
    process.exit(1);
  }
  if (!phoneNumber) {
    console.error('[ERROR] TELEGRAM_PHONE is not set. Provide as env: TELEGRAM_PHONE=+7978...');
    process.exit(1);
  }

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  const sendRes = await client.invoke(
    new Api.auth.SendCode({
      phoneNumber,
      apiId,
      apiHash,
      settings: new Api.CodeSettings({})
    })
  );

  const statePath = path.join(__dirname, 'tg_login_state.json');
  fs.writeFileSync(statePath, JSON.stringify({ phoneNumber, phoneCodeHash: sendRes.phoneCodeHash }, null, 2), 'utf8');

  // Save pre-auth session to keep DC and auth state consistent
  const sessionString = client.session.save();
  fs.writeFileSync(path.join(__dirname, 'tg_login_session.txt'), sessionString, 'utf8');

  console.log('[OK] CODE_SENT');
  console.log(`[INFO] Code sent to ${phoneNumber}. Reply here with the code.`);
  await client.disconnect();
})().catch((err) => {
  console.error('[ERROR]', err?.message || err);
  process.exit(1);
});


