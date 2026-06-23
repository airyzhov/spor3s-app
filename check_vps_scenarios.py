#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root', timeout=10)

# Проверим содержимое scenarios.ts на VPS
print("📋 Содержимое scenarios.ts на VPS:\n")
stdin, stdout, stderr = ssh.exec_command('head -100 /var/www/spor3s-app/app/ai/scenarios.ts')
content = stdout.read().decode()
print(content[:1500])

# Проверим есть ли теги add_to_cart
print("\n🔍 Поиск тегов [add_to_cart:]:")
stdin, stdout, stderr = ssh.exec_command('grep -n "add_to_cart" /var/www/spor3s-app/app/ai/scenarios.ts | head -20')
grep_result = stdout.read().decode()
if grep_result:
    print(grep_result)
else:
    print("❌ Теги НЕ найдены в scenarios.ts на VPS!")

# Перезапустим агента
print("\n🔄 Перезапускаю spor3z-agent:")
stdin, stdout, stderr = ssh.exec_command('pm2 restart spor3z-agent && sleep 2 && pm2 status | grep spor3z-agent')
print(stdout.read().decode())

ssh.close()
