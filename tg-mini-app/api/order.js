import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { product, userId, username, first_name } = req.body;
  const message = `📦 Новый заказ!\n👤 ${first_name} (@${username})\n🧠 Продукт: ${product}\n🆔 ID: ${userId}`;
  const botToken = process.env.BOT_TOKEN;
  const managerChat = process.env.MANAGER_CHAT;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ chat_id: managerChat, text: message }),
    });
    return res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error sending message");
  }
}
