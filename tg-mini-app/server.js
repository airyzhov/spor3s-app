// server.js
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.post("/order", async (req, res) => {
  const { product, userId, username, first_name } = req.body;
  const message = `📦 Новый заказ!\n👤 ${first_name} (@${username})\n🧠 Продукт: ${product}\n🆔 ID: ${userId}`;

  try {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.MANAGER_CHAT, text: message })
    });
    res.send("ok");
  } catch (err) {
    console.error("Ошибка отправки сообщения:", err);
    res.status(500).send("Ошибка");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Spor3s Mini App запущен на порту " + port));
