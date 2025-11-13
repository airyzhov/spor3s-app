#!/usr/bin/env python3
"""Настройка GitHub Secrets через CLI"""
import subprocess
import os

KEY_PATH = os.path.expanduser("~/.ssh/github_actions_key")
REPO = "airyzhov/spor3s-app"

print("Настройка GitHub Secrets...")

# Читаем приватный ключ
if not os.path.exists(KEY_PATH):
    print(f"Ключ не найден: {KEY_PATH}")
    exit(1)

with open(KEY_PATH, 'r') as f:
    priv_key = f.read()

secrets = {
    'VPS_HOST': '185.166.197.49',
    'VPS_USER': 'root',
    'VPS_SSH_KEY': priv_key
}

print(f"\nРепозиторий: {REPO}")
print("Установка secrets...\n")

for name, value in secrets.items():
    print(f"[{name}]", end=" ", flush=True)
    try:
        # Используем stdin для передачи значения
        proc = subprocess.Popen(
            ['gh', 'secret', 'set', name, '--repo', REPO],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input=value, timeout=30)
        
        if proc.returncode == 0:
            print("✓ установлен")
        else:
            print(f"✗ ошибка: {stderr.strip()}")
    except Exception as e:
        print(f"✗ исключение: {e}")

print("\nПроверка secrets...")
result = subprocess.run(['gh', 'secret', 'list', '--repo', REPO], capture_output=True, text=True)
if result.returncode == 0:
    print(result.stdout)
else:
    print("Не удалось получить список secrets")

