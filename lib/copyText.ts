// Скопировать текст в буфер обмена. В WebView Telegram navigator.clipboard есть не везде
// (или запрещён), поэтому запасной путь — скрытое поле и execCommand('copy').
// false — скопировать не вышло: тогда показываем текст, чтобы его выделили вручную.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // падаем на запасной путь
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}
