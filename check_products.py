#!/usr/bin/env python3
import requests
import json

# Получаем список товаров из приложения
url = 'http://localhost:3000/api/products'

print("🧪 Получаем список товаров из БД...\n")

try:
    response = requests.get(url, timeout=10)
    if response.status_code == 200:
        products = response.json()
        print(f"✅ Получено {len(products)} товаров:\n")
        
        for product in products:
            print(f"ID: {product.get('id', 'N/A')}")
            print(f"Name: {product.get('name', 'N/A')}")
            print(f"Price: {product.get('price', 'N/A')}")
            print(f"Description: {product.get('description', 'N/A')[:50] if product.get('description') else 'N/A'}")
            print("---")
    else:
        print(f"❌ HTTP Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Ошибка: {e}")
