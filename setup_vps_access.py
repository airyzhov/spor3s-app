#!/usr/bin/env python3
"""Настройка SSH доступа к VPS с паролем и добавление ключа"""
import paramiko
import os

VPS_HOST = "185.166.197.49"
VPS_USER = "root"
VPS_PASSWORD = "qXY.W3,,Be?@gb"
SSH_KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")
SSH_PUB_KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519.pub")

print(f"🔌 Подключение к {VPS_USER}@{VPS_HOST}...")

try:
    # Подключаемся с паролем
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        VPS_HOST,
        username=VPS_USER,
        password=VPS_PASSWORD,
        timeout=15
    )
    print("✅ Подключено успешно!")
    
    # Проверяем подключение
    stdin, stdout, stderr = ssh.exec_command('echo "Connected" && pwd && whoami && hostname && uname -a')
    output = stdout.read().decode()
    error = stderr.read().decode()
    print(f"\n📋 Информация о сервере:\n{output}")
    if error:
        print(f"Предупреждения: {error}")
    
    # Добавляем SSH ключ на сервер
    if os.path.exists(SSH_PUB_KEY_PATH):
        print(f"\n📝 Добавление SSH ключа на сервер...")
        with open(SSH_PUB_KEY_PATH, "r") as f:
            pub_key = f.read().strip()
        
        # Проверяем, есть ли уже этот ключ
        stdin, stdout, stderr = ssh.exec_command(
            f"test -f ~/.ssh/authorized_keys && grep -q '{pub_key.split()[1] if len(pub_key.split()) > 1 else pub_key}' ~/.ssh/authorized_keys && echo 'EXISTS' || echo 'NOT_EXISTS'"
        )
        key_exists = stdout.read().decode().strip()
        
        if "EXISTS" in key_exists:
            print("✅ Ключ уже добавлен на сервер")
        else:
            # Добавляем ключ
            stdin, stdout, stderr = ssh.exec_command(
                f"mkdir -p ~/.ssh && "
                f"chmod 700 ~/.ssh && "
                f"echo '{pub_key}' >> ~/.ssh/authorized_keys && "
                f"chmod 600 ~/.ssh/authorized_keys && "
                f"echo 'SUCCESS'"
            )
            result = stdout.read().decode()
            error = stderr.read().decode()
            
            if "SUCCESS" in result or not error:
                print("✅ SSH ключ успешно добавлен!")
            else:
                print(f"⚠️ Возможные проблемы: {error}")
    
    # Проверяем подключение без пароля
    print(f"\n🔍 Проверка подключения с ключом...")
    ssh.close()
    
    # Пробуем подключиться с ключом
    ssh2 = paramiko.SSHClient()
    ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh2.connect(
        VPS_HOST,
        username=VPS_USER,
        key_filename=SSH_KEY_PATH,
        timeout=10
    )
    print("✅ Подключение с ключом работает! Теперь можно использовать SSH без пароля.")
    stdin, stdout, stderr = ssh2.exec_command('echo "Key-based auth works!"')
    print(stdout.read().decode())
    ssh2.close()
    
    print("\n✅ Настройка завершена успешно!")
    print("Теперь можно использовать:")
    print(f"  ssh {VPS_USER}@{VPS_HOST}")
    print(f"  ssh spor3s-vps")
    
except paramiko.AuthenticationException:
    print("❌ Ошибка аутентификации: неверный пароль")
except Exception as e:
    print(f"❌ Ошибка: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

