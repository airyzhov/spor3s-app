#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root', timeout=10)

sftp = ssh.open_sftp()

# Загружаем chat.tsx
with open('spor3s-app/app/(client)/chat.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

with sftp.file('/var/www/spor3s-app/app/(client)/chat.tsx', 'w') as f:
    f.write(content)

print("✅ chat.tsx загружен")

sftp.close()

# Перезапускаем Next.js
stdin, stdout, stderr = ssh.exec_command('pm2 restart spor3s-nextjs && sleep 2 && pm2 status | grep nextjs')
output = stdout.read().decode()
print(output)

ssh.close()
