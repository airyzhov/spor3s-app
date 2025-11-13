#!/usr/bin/env python3
import requests
import json

# Тест через Next.js эндпоинт с более конкретным запросом
url = 'http://localhost:3000/api/ai'

headers = {
    'Content-Type': 'application/json'
}

# Тест с более конкретным запросом
data = {
    "message": "Хочу ежовик в порошке на месяц",
    "context": [],
    "source": "mini_app",
    "telegram_id": "test_user_123"
}

print("🧪 Тест: Запрос 'Хочу ежовик в порошке на месяц'")
print("Ожидаем: AI должен добавить ezh100 (порошок), НЕ ezh120k (капсулы)")
print()

try:
    response = requests.post(url, json=data, headers=headers, timeout=20, verify=False)
    if response.status_code == 200:
        result = response.json()
        ai_response = result.get('response', '')
        
        print(f"✅ Ответ получен ({len(ai_response)} символов)")
        print(f"📝 Полный ответ:\n{ai_response}\n")
        
        # Проверяем правильность тега
        if '[add_to_cart:ezh100]' in ai_response:
            print("✅ ПРАВИЛЬНО! Добавлен порошок (ezh100)")
        elif '[add_to_cart:ezh120k]' in ai_response:
            print("❌ ОШИБКА! Добавлены капсулы (ezh120k) вместо порошка!")
        elif '[add_to_cart:' in ai_response:
            print("⚠️ Добавлен товар, но неправильный тег")
        else:
            print("❌ Товар не добавлен в корзину")
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Ошибка: {e}")
