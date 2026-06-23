#!/usr/bin/env python3
import urllib.request
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

url = 'https://ai.spor3s.ru/'
with urllib.request.urlopen(url) as response:
    html = response.read().decode('utf-8')

if 'charSet="utf-8"' in html or 'charset=utf-8' in html or "charset='utf-8'" in html:
    print("✅ charset UTF-8 найден в HTML")
else:
    print("❌ charset UTF-8 НЕ найден")

# Проверим что реально в head
import re
head_match = re.search(r'<head>(.*?)</head>', html, re.DOTALL)
if head_match:
    head = head_match.group(1)
    if 'charSet' in head or 'charset' in head:
        print("✅ Любой charset найден в <head>")
        # Найдем все мета теги
        meta_charset = re.search(r'<meta\s+charSet="([^"]*)"', head)
        if meta_charset:
            print(f"   charset значение: {meta_charset.group(1)}")
    else:
        print("❌ Ни одного charset не найдено в <head>")
        print("   Первые 500 символов <head>:")
        print(head[:500])
