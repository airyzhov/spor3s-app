const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwBa0MvuuxpNGfHQJE2b5bBckewoi-Klf5RHkJIj6GOesHvhNgSk58fTcSzQu6fqhXs_g/exec";

app.post("/order", async (req, res) => {
  const { product, userId, username, first_name } = req.body;
  const message = `📦 Новый заказ!\n👤 ${first_name} (@${username})\n🧠 Продукт: ${product}\n🆔 ID: ${userId}`;

  const botToken = process.env.BOT_TOKEN;
  const managerChat = process.env.MANAGER_CHAT || "@web3grow";

  try {
    // Отправка сообщения в Telegram
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: managerChat, text: message }),
    });

    // Отправка данных в Google Apps Script
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, userId, username, first_name }),
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).send({ status: "error", message: error.message });
  }
});
