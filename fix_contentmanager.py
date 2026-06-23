#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root')

# Копируем локальный lib/contentManager.ts в app/lib/contentManager.ts
sftp = ssh.open_sftp()

# Читаем локальный файл
with open('spor3s-app/lib/contentManager.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Пишем на VPS в app/lib
with sftp.file('/var/www/spor3s-app/app/lib/contentManager.ts', 'w') as f:
    f.write(content)

print("✅ app/lib/contentManager.ts синхронизирован")

# Также скопируем в корневой lib на случай
with sftp.file('/var/www/spor3s-app/lib/contentManager.ts', 'w') as f:
    f.write(content)

print("✅ lib/contentManager.ts синхронизирован")

sftp.close()
ssh.close()
