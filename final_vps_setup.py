#!/usr/bin/env python3
"""Финальная настройка VPS: добавление ключа и запуск приложения"""
import paramiko
import time
import sys

VPS_HOST = "185.166.197.49"
VPS_USER = "root"
VPS_PASSWORD = "qXY.W3,,Be?@gb"
PUB_KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPzNkCTBK5f7qgcmT/v/Yx6yXjo+Jr2o3fbzlQbxHUXX github-actions-spor3s"

print("=" * 60)
print("Финальная настройка VPS")
print("=" * 60)

# Метод 1: Прямое подключение с паролем
try:
    print(f"\n[1] Подключение к {VPS_USER}@{VPS_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Пробуем подключиться с разными параметрами
    ssh.connect(
        VPS_HOST,
        username=VPS_USER,
        password=VPS_PASSWORD,
        timeout=30,
        look_for_keys=False,
        allow_agent=False,
        compress=True
    )
    print("✓ Подключено!")
    
    # Добавляем ключ
    print("\n[2] Добавление SSH ключа...")
    commands = [
        "mkdir -p ~/.ssh",
        "chmod 700 ~/.ssh",
        f"grep -q 'github-actions-spor3s' ~/.ssh/authorized_keys 2>/dev/null || echo '{PUB_KEY}' >> ~/.ssh/authorized_keys",
        "chmod 600 ~/.ssh/authorized_keys",
        "echo 'KEY_ADDED'"
    ]
    
    for cmd in commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode()
        error = stderr.read().decode()
        if "KEY_ADDED" in output:
            print("✓ Ключ добавлен")
    
    # Проверяем/настраиваем проект
    print("\n[3] Настройка проекта...")
    setup_commands = [
        "cd /var/www/spor3s-app 2>/dev/null || mkdir -p /var/www/spor3s-app && cd /var/www/spor3s-app",
        "pwd",
        "if [ ! -d .git ]; then git clone https://github.com/airyzhov/spor3s-app.git .; fi",
        "git pull origin main || true",
        "echo 'PROJECT_READY'"
    ]
    
    for cmd in setup_commands:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode()
        if "PROJECT_READY" in output:
            print("✓ Проект готов")
    
    ssh.close()
    print("\n✓ VPS настроен!")
    print("\nТеперь GitHub Actions сможет подключиться и выполнить деплой")
    
except Exception as e:
    print(f"\n✗ Ошибка подключения: {type(e).__name__}: {e}")
    print("\nАльтернативный способ:")
    print("1. Подключитесь к VPS другим способом")
    print("2. Выполните:")
    print(f"   echo '{PUB_KEY}' >> ~/.ssh/authorized_keys")
    print("   chmod 600 ~/.ssh/authorized_keys")
    sys.exit(1)

