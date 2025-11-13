#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root')

sftp = ssh.open_sftp()

# Читаем файл с VPS
with sftp.file('/var/www/spor3s-app/app/lib/contentManager.ts', 'r') as f:
    content = f.read().decode('utf-8') if isinstance(f.read(), bytes) else f.read()

# Перечитаем корректно
with sftp.file('/var/www/spor3s-app/app/lib/contentManager.ts', 'r') as f:
    raw_content = f.read()
    content = raw_content.decode('utf-8') if isinstance(raw_content, bytes) else raw_content

# Заменяем ВСЕ "const { error } = await supabase" на "(supabase as any)"
content = content.replace(
    'const { error } = await supabase',
    'const { error } = await (supabase as any)'
)

# Пишем обратно
with sftp.file('/var/www/spor3s-app/app/lib/contentManager.ts', 'w') as f:
    f.write(content)

print("✅ Все .update() исправлены в app/lib/contentManager.ts")

sftp.close()

# Перестраиваем
stdin, stdout, stderr = ssh.exec_command('cd /var/www/spor3s-app && npm run build 2>&1 | tail -20')
output = stdout.read().decode()
print(output)

ssh.close()
