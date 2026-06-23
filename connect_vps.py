#!/usr/bin/env python3
"""Подключение к VPS через paramiko с разными методами"""
import paramiko
import os
import sys
import getpass

VPS_HOST = "185.166.197.49"
VPS_USER = "root"
SSH_KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")

print(f"🔌 Попытка подключения к {VPS_HOST}...")

# Метод 1: С ключом
if os.path.exists(SSH_KEY_PATH):
    print("\n1️⃣ Попытка с SSH ключом...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            VPS_HOST,
            username=VPS_USER,
            key_filename=SSH_KEY_PATH,
            timeout=15,
            look_for_keys=False,
            allow_agent=False
        )
        print("✅ Подключено!")
        stdin, stdout, stderr = ssh.exec_command('echo "Connected" && pwd && whoami && hostname')
        output = stdout.read().decode()
        error = stderr.read().decode()
        print(f"Результат:\n{output}")
        if error:
            print(f"Ошибки:\n{error}")
        ssh.close()
        sys.exit(0)
    except Exception as e:
        print(f"❌ Ошибка: {type(e).__name__}: {e}")

# Метод 2: С паролем (интерактивно)
print("\n2️⃣ Попытка с паролем...")
try:
    password = getpass.getpass(f"Введите пароль для {VPS_USER}@{VPS_HOST}: ")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        VPS_HOST,
        username=VPS_USER,
        password=password,
        timeout=15
    )
    print("✅ Подключено с паролем!")
    stdin, stdout, stderr = ssh.exec_command('echo "Connected" && pwd && whoami && hostname')
    output = stdout.read().decode()
    print(f"Результат:\n{output}")
    
    # Пробуем добавить ключ на сервер
    print("\n📝 Добавление SSH ключа на сервер...")
    if os.path.exists(SSH_KEY_PATH + ".pub"):
        with open(SSH_KEY_PATH + ".pub", "r") as f:
            pub_key = f.read().strip()
        
        # Добавляем ключ в authorized_keys
        stdin, stdout, stderr = ssh.exec_command(
            f"mkdir -p ~/.ssh && "
            f"chmod 700 ~/.ssh && "
            f"grep -q '{pub_key.split()[1]}' ~/.ssh/authorized_keys 2>/dev/null || "
            f"echo '{pub_key}' >> ~/.ssh/authorized_keys && "
            f"chmod 600 ~/.ssh/authorized_keys && "
            f"echo 'Key added successfully'"
        )
        result = stdout.read().decode()
        error = stderr.read().decode()
        print(result)
        if error and "grep" not in error:
            print(f"Предупреждения: {error}")
        print("✅ Ключ добавлен! Теперь можно подключаться без пароля.")
    
    ssh.close()
    sys.exit(0)
except KeyboardInterrupt:
    print("\n❌ Прервано пользователем")
    sys.exit(1)
except paramiko.AuthenticationException:
    print("❌ Неверный пароль")
except Exception as e:
    print(f"❌ Ошибка: {type(e).__name__}: {e}")

print("\n❌ Не удалось подключиться")
sys.exit(1)

