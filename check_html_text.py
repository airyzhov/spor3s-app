#!/usr/bin/env python3
import urllib.request
import ssl
import re

ssl._create_default_https_context = ssl._create_unverified_context

url = 'https://ai.spor3s.ru/'
with urllib.request.urlopen(url) as response:
    html = response.read().decode('utf-8')

# Ищем текст "Привет" или "AI" в HTML
if 'Привет' in html:
    print("✅ 'Привет' найдено в HTML")
else:
    print("❌ 'Привет' НЕ найдено в HTML")

if 'Консультант' in html:
    print("✅ 'Консультант' найдено в HTML")
else:
    print("❌ 'Консультант' НЕ найдено в HTML")

# Ищем вопросительные знаки
question_count = html.count('?')
print(f"\n❓ Количество '?' в HTML: {question_count}")

# Проверяем что находится в чате
if '???? AI' in html:
    print("⚠️ Текст поломан - найдено '???? AI'")

# Попробуем найти начало чата
chat_match = re.search(r'<div[^>]*>.*?(?:Привет|????|AI).*?</div>', html, re.DOTALL)
if chat_match:
    print(f"\n📍 Найден фрагмент чата:")
    print(chat_match.group(0)[:300])
else:
    print("\n❌ Фрагмент чата не найден")
