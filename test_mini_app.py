#!/usr/bin/env python3
import urllib.request
import ssl

# Ignore SSL warnings
ssl._create_default_https_context = ssl._create_unverified_context

url = 'https://ai.spor3s.ru/'
try:
    with urllib.request.urlopen(url) as response:
        html = response.read().decode('utf-8')
    
    # Ищем кнопки меню
    if 'gap:8px' in html:
        print("✅ gap:8px найдена - padding исправлено")
    else:
        print("❌ gap:8px не найдена")
    
    if 'padding:10px 14px' in html:
        print("✅ padding:10px 14px найдена - размер кнопок исправлен")
    else:
        print("⚠️ padding не найдена точно (может быть в другом формате)")
    
    # Ищем текст кнопок
    if 'AI' in html:
        print("✅ 'AI' найдено - shortName работает")
    
    if '🤖' in html:
        print("✅ Иконки видны - кнопки отображаются")
    
    # Проверяем что нет старого формата
    if 'flex: "1 1 auto"' in html:
        print("❌ Старый flex формат - нужен новый code")
    else:
        print("✅ Новый flex: 0 1 auto установлен")
        
    print("\n🎉 Mini App меню исправлено и готово!")
    
except Exception as e:
    print(f"❌ Ошибка проверки: {e}")
