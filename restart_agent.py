#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root', timeout=10)

print("🔄 Перезапускаю spor3z-agent для обновления промптов...")

# Перезапускаем агента
stdin, stdout, stderr = ssh.exec_command('pm2 restart spor3z-agent && sleep 3 && pm2 status | grep spor3z-agent')
output = stdout.read().decode()
print(output)

# Проверяем что агент работает
stdin, stdout, stderr = ssh.exec_command('pm2 logs spor3z-agent --lines 10')
logs = stdout.read().decode()
print("\n📋 Последние логи агента:")
print(logs)

ssh.close()
