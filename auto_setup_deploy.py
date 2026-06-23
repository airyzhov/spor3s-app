#!/usr/bin/env python3
"""Автоматическая настройка деплоя: генерация ключа, добавление на VPS, настройка GitHub"""
import paramiko
import os
import subprocess
import sys

VPS_HOST = "185.166.197.49"
VPS_USER = "root"
VPS_PASSWORD = "qXY.W3,,Be?@gb"
KEY_PATH = os.path.expanduser("~/.ssh/github_actions_key")
PUB_KEY_PATH = KEY_PATH + ".pub"

print("=" * 60)
print("Автоматическая настройка деплоя")
print("=" * 60)

# Шаг 1: Генерация SSH ключа
print("\n[1/4] Генерация SSH ключа...")
if os.path.exists(KEY_PATH):
    print(f"Ключ уже существует: {KEY_PATH}")
    overwrite = input("Перезаписать? (y/n): ")
    if overwrite.lower() != 'y':
        print("Используем существующий ключ")
    else:
        os.remove(KEY_PATH)
        if os.path.exists(PUB_KEY_PATH):
            os.remove(PUB_KEY_PATH)

if not os.path.exists(KEY_PATH):
    print("Генерация нового ключа...")
    result = subprocess.run([
        'ssh-keygen', '-t', 'ed25519', '-C', 'github-actions-spor3s',
        '-f', KEY_PATH, '-N', ''
    ], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Ошибка генерации ключа: {result.stderr}")
        sys.exit(1)
    print("Ключ создан")

# Читаем ключи
with open(PUB_KEY_PATH, 'r') as f:
    pub_key = f.read().strip()
with open(KEY_PATH, 'r') as f:
    priv_key = f.read().strip()

print(f"Публичный ключ: {PUB_KEY_PATH}")
print(f"Приватный ключ: {KEY_PATH}")

# Шаг 2: Добавление ключа на VPS
print("\n[2/4] Добавление ключа на VPS...")
try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Подключение к {VPS_USER}@{VPS_HOST}...")
    ssh.connect(
        VPS_HOST,
        username=VPS_USER,
        password=VPS_PASSWORD,
        timeout=15
    )
    print("Подключено успешно!")
    
    # Проверяем, есть ли уже этот ключ
    stdin, stdout, stderr = ssh.exec_command(
        f"test -f ~/.ssh/authorized_keys && grep -q '{pub_key.split()[1] if len(pub_key.split()) > 1 else pub_key}' ~/.ssh/authorized_keys && echo 'EXISTS' || echo 'NOT_EXISTS'"
    )
    key_exists = stdout.read().decode().strip()
    
    if "EXISTS" in key_exists:
        print("Ключ уже добавлен на VPS")
    else:
        print("Добавление ключа...")
        # Создаем директорию если нужно
        ssh.exec_command("mkdir -p ~/.ssh && chmod 700 ~/.ssh")
        
        # Добавляем ключ
        stdin, stdout, stderr = ssh.exec_command(
            f"echo '{pub_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SUCCESS'"
        )
        result = stdout.read().decode()
        error = stderr.read().decode()
        
        if "SUCCESS" in result or not error:
            print("Ключ успешно добавлен на VPS!")
        else:
            print(f"Предупреждение: {error}")
    
    # Проверяем подключение с ключом
    print("Проверка подключения с ключом...")
    ssh.close()
    
    ssh2 = paramiko.SSHClient()
    ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh2.connect(
        VPS_HOST,
        username=VPS_USER,
        key_filename=KEY_PATH,
        timeout=10
    )
    print("Подключение с ключом работает!")
    ssh2.close()
    
except paramiko.AuthenticationException:
    print("Ошибка: неверный пароль")
    sys.exit(1)
except Exception as e:
    print(f"Ошибка подключения: {type(e).__name__}: {e}")
    print("Продолжаем без добавления ключа на VPS...")

# Шаг 3: Проверка GitHub CLI
print("\n[3/4] Настройка GitHub Secrets...")
gh_installed = subprocess.run(['gh', '--version'], capture_output=True).returncode == 0

if gh_installed:
    print("GitHub CLI установлен")
    repo = "airyzhov/spor3s-app"
    
    # Проверяем авторизацию
    auth_check = subprocess.run(['gh', 'auth', 'status'], capture_output=True, text=True)
    if auth_check.returncode != 0:
        print("GitHub CLI не авторизован")
        print("Выполните: gh auth login")
        print("Или настройте secrets вручную через веб-интерфейс")
    else:
        print("Настройка secrets через GitHub CLI...")
        
        # Устанавливаем secrets
        secrets = {
            'VPS_HOST': VPS_HOST,
            'VPS_USER': VPS_USER,
            'VPS_SSH_KEY': priv_key
        }
        
        for name, value in secrets.items():
            print(f"Установка {name}...")
            try:
                # Используем stdin для передачи значения
                result = subprocess.run([
                    'gh', 'secret', 'set', name,
                    '--repo', repo,
                    '-b', value
                ], capture_output=True, text=True, input=value)
                
                if result.returncode == 0:
                    print(f"  {name}: установлен")
                else:
                    # Пробуем через stdin
                    proc = subprocess.Popen([
                        'gh', 'secret', 'set', name,
                        '--repo', repo
                    ], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                    stdout, stderr = proc.communicate(input=value)
                    if proc.returncode == 0:
                        print(f"  {name}: установлен")
                    else:
                        print(f"  {name}: ошибка - {stderr}")
            except Exception as e:
                print(f"  {name}: ошибка - {e}")
else:
    print("GitHub CLI не установлен")
    print("Настройте secrets вручную:")
    print(f"  VPS_HOST = {VPS_HOST}")
    print(f"  VPS_USER = {VPS_USER}")
    print(f"  VPS_SSH_KEY = (приватный ключ из {KEY_PATH})")

# Шаг 4: Информация о следующих шагах
print("\n[4/4] Итоговая информация")
print("=" * 60)
print("\nПубличный ключ (добавлен на VPS):")
print(pub_key)
print("\nПриватный ключ (для GitHub Secrets):")
print(f"Файл: {KEY_PATH}")
print("\nЕсли GitHub Secrets не настроены автоматически:")
print("1. Откройте: https://github.com/airyzhov/spor3s-app/settings/secrets/actions")
print("2. Добавьте секреты:")
print(f"   VPS_HOST = {VPS_HOST}")
print(f"   VPS_USER = {VPS_USER}")
print(f"   VPS_SSH_KEY = (содержимое файла {KEY_PATH})")
print("\nПосле настройки secrets:")
print("- Сделайте push в main для запуска деплоя")
print("- Или запустите workflow вручную через GitHub Actions")
print("\n" + "=" * 60)

