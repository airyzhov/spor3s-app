#!/usr/bin/env python3
"""Добавление SSH ключа на VPS через прямое подключение"""
import paramiko
import os

VPS_HOST = "185.166.197.49"
VPS_USER = "root"
VPS_PASSWORD = "qXY.W3,,Be?@gb"
KEY_PATH = os.path.expanduser("~/.ssh/github_actions_key.pub")

print("Добавление SSH ключа на VPS...")

if not os.path.exists(KEY_PATH):
    print(f"Ключ не найден: {KEY_PATH}")
    exit(1)

with open(KEY_PATH, 'r') as f:
    pub_key = f.read().strip()

print(f"Публичный ключ: {pub_key[:50]}...")

# Пробуем разные методы подключения
methods = [
    {'password': VPS_PASSWORD},
]

for method in methods:
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"\nПопытка подключения к {VPS_USER}@{VPS_HOST}...")
        ssh.connect(
            VPS_HOST,
            username=VPS_USER,
            **method,
            timeout=20,
            look_for_keys=False,
            allow_agent=False
        )
        print("Подключено!")
        
        # Добавляем ключ
        print("Добавление ключа...")
        commands = [
            "mkdir -p ~/.ssh",
            "chmod 700 ~/.ssh",
            f"grep -q '{pub_key.split()[1] if len(pub_key.split()) > 1 else pub_key}' ~/.ssh/authorized_keys || echo '{pub_key}' >> ~/.ssh/authorized_keys",
            "chmod 600 ~/.ssh/authorized_keys",
            "echo 'SUCCESS'"
        ]
        
        for cmd in commands:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = stdout.read().decode()
            error = stderr.read().decode()
            if error and "grep" not in error:
                print(f"  Команда: {cmd}")
                if error:
                    print(f"  Предупреждение: {error}")
        
        if "SUCCESS" in output:
            print("Ключ успешно добавлен!")
        else:
            print("Ключ добавлен (возможно уже был)")
        
        ssh.close()
        print("Готово!")
        exit(0)
        
    except Exception as e:
        print(f"Ошибка: {type(e).__name__}: {e}")
        continue

print("\nНе удалось подключиться к VPS")
print("Добавьте ключ вручную:")
print(f"ssh {VPS_USER}@{VPS_HOST}")
print(f"echo '{pub_key}' >> ~/.ssh/authorized_keys")
print("chmod 600 ~/.ssh/authorized_keys")

