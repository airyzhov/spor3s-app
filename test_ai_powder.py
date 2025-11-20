#!/usr/bin/env python3
import requests
import json

def test_ai_api():
    url = "https://ai.spor3s.ru/api/ai"
    
    test_cases = [
        {
            "message": "Ежовик в порошке на месяц добавь",
            "source": "mini_app",
            "expected_keywords": ["порошок", "100г", "ezh100", "уточн"]
        },
        {
            "message": "Ежовик на месяц",
            "source": "mini_app", 
            "expected_keywords": ["форма", "капсулы", "порошок", "уточн"]
        },
        {
            "message": "Мухомор в порошке на месяц",
            "source": "mini_app",
            "expected_keywords": ["30г", "mhm30", "шляпки"]
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n=== ТЕСТ {i}: {test['message']} ===")
        
        try:
            response = requests.post(url, json=test, timeout=30)
            print(f"Статус: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data.get('response', '')
                print(f"Ответ AI: {ai_response}")
                
                # Проверяем наличие тегов
                import re
                add_to_cart_tags = re.findall(r'\[add_to_cart:([\w-]+)\]', ai_response)
                print(f"Теги add_to_cart: {add_to_cart_tags}")
                
                # Проверяем ключевые слова
                found_keywords = []
                for keyword in test['expected_keywords']:
                    if keyword.lower() in ai_response.lower():
                        found_keywords.append(keyword)
                
                print(f"Найденные ключевые слова: {found_keywords}")
                
                if add_to_cart_tags:
                    print("✅ Есть теги добавления в корзину")
                else:
                    print("❌ Нет тегов добавления в корзину")
                    
            else:
                print(f"Ошибка: {response.text}")
                
        except Exception as e:
            print(f"Ошибка запроса: {e}")

if __name__ == "__main__":
    test_ai_api()













