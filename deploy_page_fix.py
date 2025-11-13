#!/usr/bin/env python3
import paramiko
import sys

# Читаем файл локально
with open('spor3s-app/app/(client)/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Подключаемся к VPS
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root')

# Загружаем файл
sftp = ssh.open_sftp()
with sftp.file('/var/www/spor3s-app/app/(client)/page.tsx', 'w') as f:
    f.write(content)
sftp.close()

print("✅ Файл успешно загружен на VPS")

# Перезапускаем Next.js
stdin, stdout, stderr = ssh.exec_command('pm2 restart spor3s-nextjs')
output = stdout.read().decode()
print("✅ Next.js перезапущен")
print(output)

ssh.close()
