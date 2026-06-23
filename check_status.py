#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root', timeout=10)

print("📊 Проверяю статус сервисов...")

# Проверяем статус PM2
stdin, stdout, stderr = ssh.exec_command('pm2 status')
output = stdout.read().decode()
print("PM2 Status:")
print(output)

# Проверяем логи Next.js
print("\n📋 Логи Next.js (последние 20 строк):")
stdin, stdout, stderr = ssh.exec_command('pm2 logs spor3s-nextjs --lines 20')
logs = stdout.read().decode()
print(logs)

# Проверяем доступность порта
print("\n🌐 Проверяю доступность порта 3000:")
stdin, stdout, stderr = ssh.exec_command('curl -I http://localhost:3000 2>/dev/null | head -1')
port_check = stdout.read().decode()
print(f"Port 3000: {port_check}")

ssh.close()
