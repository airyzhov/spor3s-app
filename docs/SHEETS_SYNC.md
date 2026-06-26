# Синхронизация заказов в Google Sheets (Apps Script)

Простой способ дублировать новые заказы в твою общую таблицу — без n8n и без библиотек.
Принцип: при заказе приложение шлёт POST в веб-приложение Apps Script, которое добавляет строку в лист `orders`.

## Шаги настройки (делается один раз)

1. Открой свою таблицу:
   https://docs.google.com/spreadsheets/d/1ZS8C0_mwUsWr1vgy_lLJ0XPDTmKYT5S9JMWQKfkvADU/edit
2. Меню **Расширения → Apps Script**.
3. Удали что есть, вставь код ниже, сохрани (Ctrl+S).
4. Нажми **Развернуть → Новое развёртывание**.
5. Тип — **Веб-приложение**. Настройки:
   - «Запуск от имени»: **от меня**
   - «У кого есть доступ»: **Все** (Anyone)
6. Нажми **Развернуть**, разреши доступ.
7. Скопируй **URL веб-приложения** (вида `https://script.google.com/macros/s/AKfyc.../exec`)
   и пришли его мне — я пропишу `SHEET_WEBHOOK_URL` в окружении.

## Код Apps Script

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('orders');
    if (!sheet) sheet = ss.insertSheet('orders');

    // Заголовок, если лист пустой
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Дата', 'ФИО', 'Телефон', 'Адрес', 'Товары', 'Сумма', 'Статус', 'Комментарий', 'Реф.код']);
    }

    sheet.appendRow([
      data.id || '',
      data.created_at || '',
      data.fio || '',
      data.phone || '',
      data.address || '',
      data.items || '',
      data.total || '',
      data.status || '',
      data.comment || '',
      data.referral_code || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Как это работает в коде

В `app/api/order/route.ts` (шаг 11) при создании заказа делается POST на `SHEET_WEBHOOK_URL`
с данными заказа. Если переменная не задана — синк просто пропускается (заказ создаётся как обычно).

> Важно: каждый раз после правки скрипта нужно делать **новое развёртывание** (или «Управление развёртываниями» → редактировать версию), иначе изменения не применятся.
