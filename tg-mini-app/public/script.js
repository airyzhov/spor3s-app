function sendOrder() {
  const product = document.getElementById("product").value;

  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe.user || {};

  const data = {
    product,
    userId: user.id || "unknown",
    username: user.username || "unknown",
    first_name: user.first_name || "unknown",
  };

  fetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.status === "ok") {
        document.getElementById("status").textContent = "✅ Заказ отправлен!";
      } else {
        document.getElementById("status").textContent = "❌ Ошибка при отправке заказа";
      }
    })
    .catch(() => {
      document.getElementById("status").textContent = "❌ Ошибка сети";
    });
}
