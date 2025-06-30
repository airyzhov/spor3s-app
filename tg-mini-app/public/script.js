// public/script.js
function sendOrder() {
  const product = document.getElementById('product').value;
  const tg = window.Telegram.WebApp;

  fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product,
      userId: tg.initDataUnsafe.user?.id,
      username: tg.initDataUnsafe.user?.username,
      first_name: tg.initDataUnsafe.user?.first_name
    })
  })
  .then(res => res.text())
  .then(data => {
    alert('Заказ отправлен!');
    tg.close();
  });
}
