#!/usr/bin/env python3
import requests
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

# Тестируем API
url = 'https://ai.spor3s.ru/api/ai'
data = {
    "message": "Привет! Что ты можешь мне порекомендовать?",
    "context": [],
    "source": "mini_app",
    "telegram_id": "test_123"
}

try:
    response = requests.post(url, json=data, timeout=15, verify=False)
    print(f"Status: {response.status_code}")
    print(f"Headers: {response.headers}")
    
    if response.ok:
        result = response.json()
        print(f"\n✅ API Response:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
        # Проверяем русский текст
        if 'response' in result:
            text = result['response']
            print(f"\n📝 Текст ответа ({len(text)} символов):")
            print(text[:200])
            
            # Проверяем кодировку
            try:
                text.encode('utf-8')
                print("✅ Текст корректно кодируется в UTF-8")
            except Exception as e:
                print(f"❌ Ошибка кодировки: {e}")
    else:
        print(f"❌ Ошибка: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Ошибка запроса: {e}")
