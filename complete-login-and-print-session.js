// Completes login with the received code and prints the session string
// Usage:
//   TELEGRAM_CODE=12345 node complete-login-and-print-session.js
// It reads phone and phoneCodeHash from tg_login_state.json created by send-login-code.js

const fs = require('fs');
const path = require('path');
let dotenv;
try {
  dotenv = require('./spor3s-app/spor3s-app/node_modules/dotenv');
} catch (e) {
  dotenv = null;
}
const { createRequire } = require('module');
const appRequire = createRequire(path.join(__dirname, 'spor3s-app', 'spor3s-app', 'package.json'));
const { TelegramClient } = appRequire('telegram');
const { StringSession } = appRequire('telegram/sessions');
const { Api } = appRequire('telegram');

(async () => {
  if (dotenv) {
    dotenv.config({ path: path.join(__dirname, 'spor3s-app', 'spor3s-app', 'env.local') });
  } else {
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
  const code = process.env.TELEGRAM_CODE || process.env.CODE;
  if (!code) {
    console.error('[ERROR] TELEGRAM_CODE is not set. Provide as env: TELEGRAM_CODE=12345');
    process.exit(1);
  }

  const statePath = path.join(__dirname, 'tg_login_state.json');
  if (!fs.existsSync(statePath)) {
    console.error('[ERROR] tg_login_state.json not found. Run send-login-code.js first.');
    process.exit(1);
  }
  const { phoneNumber, phoneCodeHash } = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  // Reuse the session saved during code sending to avoid DC mismatch and expiration
  const sessionPath = path.join(__dirname, 'tg_login_session.txt');
  const initialSession = fs.existsSync(sessionPath) ? fs.readFileSync(sessionPath, 'utf8').trim() : '';
  const session = new StringSession(initialSession);
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  let signRes;
  try {
    signRes = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      })
    );
  } catch (e) {
    if (String(e?.message || '').includes('SESSION_PASSWORD_NEEDED')) {
      const password = process.env.TELEGRAM_PASSWORD || '';
      if (!password) {
        console.error('[ERROR] Two-factor auth is enabled. Please set TELEGRAM_PASSWORD env and rerun.');
        process.exit(1);
      }
      await client.checkPassword(password);
    } else {
      throw e;
    }
  }

  const sessionString = client.session.save();
  console.log('[OK] LOGIN_SUCCESS');
  console.log('SESSION_STRING=' + sessionString);

  // Persist to env.local (replace or add TELEGRAM_SESSION_STRING)
  // Write to inner app env.local (one level deeper from repo root)
  const envPath = path.join(__dirname, 'spor3s-app', 'env.local');
  let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (envText.includes('TELEGRAM_SESSION_STRING=')) {
    envText = envText.replace(/TELEGRAM_SESSION_STRING=.*/g, 'TELEGRAM_SESSION_STRING=' + sessionString);
  } else {
    envText += (envText.endsWith('\n') ? '' : '\n') + 'TELEGRAM_SESSION_STRING=' + sessionString + '\n';
  }
  fs.writeFileSync(envPath, envText, 'utf8');
  console.log('[OK] env.local updated with TELEGRAM_SESSION_STRING');

  await client.disconnect();
})().catch((err) => {
  console.error('[ERROR]', err?.message || err);
  process.exit(1);
});


