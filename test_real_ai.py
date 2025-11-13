#!/usr/bin/env python3
import requests
import json

# Тест через Next.js эндпоинт
url = 'http://localhost:3000/api/ai'

headers = {
    'Content-Type': 'application/json'
}

# Тест 1: Запрос про Ежовик
data1 = {
    "message": "Мне нужен ежовик для памяти, какой выбрать?",
    "context": [],
    "source": "mini_app",
    "telegram_id": "test_user_123"
}

print("🧪 Тест 1: Запрос через Next.js API")
print("Запрос:", data1["message"])
print()

try:
    response = requests.post(url, json=data1, headers=headers, timeout=20, verify=False)
    if response.status_code == 200:
        result = response.json()
        ai_response = result.get('response', '')
        
        print(f"✅ Ответ получен ({len(ai_response)} символов)")
        print(f"📝 Полный ответ:\n{ai_response}\n")
        
        # Проверяем наличие тегов
        if '[add_to_cart:' in ai_response:
            tags = []
            import re
            for match in re.finditer(r'\[add_to_cart:([\w-]+)\]', ai_response):
                tags.append(match.group(1))
            print(f"✅ Найдены теги: {tags}")
        else:
            print("❌ Теги [add_to_cart:] НЕ найдены!")
        
        # Проверяем про бота
        if 't.me/spor3s_bot' in ai_response or '@spor3s_bot' in ai_response:
            print("❌ Ссылка на бота всё ещё есть в ответе!")
        else:
            print("✅ Ссылка на бота удалена")
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Ошибка: {e}")

print("\n" + "="*60 + "\n")

# Тест 2: Запрос про Мухомор
data2 = {
    "message": "Хочу мухомор для сна, в капсулах",
    "context": [],
    "source": "mini_app",
    "telegram_id": "test_user_456"
}

print("🧪 Тест 2: Запрос про Мухомор")
print("Запрос:", data2["message"])
print()

try:
    response = requests.post(url, json=data2, headers=headers, timeout=20, verify=False)
    if response.status_code == 200:
        result = response.json()
        ai_response = result.get('response', '')
        
        print(f"✅ Ответ получен ({len(ai_response)} символов)")
        print(f"📝 Полный ответ:\n{ai_response}\n")
        
        # Проверяем наличие тегов
        if '[add_to_cart:' in ai_response:
            tags = []
            import re
            for match in re.finditer(r'\[add_to_cart:([\w-]+)\]', ai_response):
                tags.append(match.group(1))
            print(f"✅ Найдены теги: {tags}")
        else:
            print("❌ Теги [add_to_cart:] НЕ найдены!")
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Ошибка: {e}")
