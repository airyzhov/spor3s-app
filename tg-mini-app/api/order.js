// api/order.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { product, userId, username, first_name } = req.body;

  const message = `📦 Новый заказ!\n👤 ${first_name} (@${username})\n🧠 Продукт: ${product}\n🆔 ID: ${userId}`;
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const CHAT_ID = process.env.MANAGER_CHAT || '@web3grow';

  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message })
    });

    res.status(200).send('ok');
  } catch (err) {
    console.error('Telegram error:', err);
    res.status(500).send('Error');
  }
}
