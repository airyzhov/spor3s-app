#!/usr/bin/env python3
import requests
import json

url = 'https://ai.spor3s.ru/api/ai'

# Тест 1: Просьба добавить товар
data1 = {
    "message": "Хочу ежовик месяц",
    "context": [],
    "source": "mini_app",
    "telegram_id": "test_123"
}

print("🧪 Тест 1: Запрос 'Хочу ежовик месяц'")
try:
    response = requests.post(url, json=data1, timeout=15, verify=False)
    result = response.json()
    ai_response = result.get('response', '')
    
    print(f"✅ Ответ получен ({len(ai_response)} символов)")
    print(f"📝 Текст:\n{ai_response[:500]}\n")
    
    # Проверяем наличие тегов
    if '[add_to_cart:' in ai_response:
        print("✅ Теги [add_to_cart:] НАЙДЕНЫ в ответе!")
    else:
        print("❌ Теги [add_to_cart:] НЕ найдены!")
    
    # Проверяем про бота
    if 't.me/spor3s_bot' in ai_response or '@spor3s_bot' in ai_response:
        print("❌ Ссылка на бота всё ещё есть в ответе!")
    else:
        print("✅ Ссылка на бота удалена")
        
except Exception as e:
    print(f"❌ Ошибка: {e}")

print("\n" + "="*50 + "\n")

# Тест 2: Запрос про цену
data2 = {
    "message": "Сколько стоит мухомор?",
    "context": [],
    "source": "mini_app",
    "telegram_id": "test_456"
}

print("🧪 Тест 2: Запрос 'Сколько стоит мухомор?'")
try:
    response = requests.post(url, json=data2, timeout=15, verify=False)
    result = response.json()
    ai_response = result.get('response', '')
    
    print(f"✅ Ответ получен ({len(ai_response)} символов)")
    print(f"📝 Текст:\n{ai_response[:500]}\n")
    
except Exception as e:
    print(f"❌ Ошибка: {e}")
