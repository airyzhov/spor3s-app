async function sendOrder() {
  const product = document.getElementById("product").value;

  // Получаем данные пользователя из Telegram WebApp (если используешь Telegram)
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
  const userId = tgUser.id || "unknown";
  const username = tgUser.username || "unknown";
  const first_name = tgUser.first_name || "unknown";

  try {
    const response = await fetch("/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, userId, username, first_name }),
    });

    if (response.ok) {
      alert("Заказ отправлен! Спасибо 😊");
    } else {
      alert("Ошибка при отправке заказа. Попробуйте позже.");
    }
  } catch (error) {
    alert("Ошибка соединения. Проверьте интернет.");
  }
}
