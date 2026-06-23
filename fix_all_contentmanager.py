#!/usr/bin/env python3
import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', username='root')

sftp = ssh.open_sftp()

# Список всех файлов contentManager.ts на VPS
files_to_fix = [
    '/var/www/spor3s-app/contentManager.ts',
    '/var/www/spor3s-app/lib/contentManager.ts',
    '/var/www/spor3s-app/app/lib/contentManager.ts'
]

for file_path in files_to_fix:
    try:
        # Читаем файл
        with sftp.file(file_path, 'r') as f:
            raw = f.read()
            content = raw.decode('utf-8') if isinstance(raw, bytes) else raw
        
        # Заменяем
        if 'const { error } = await supabase' in content:
            content = content.replace(
                'const { error } = await supabase',
                'const { error } = await (supabase as any)'
            )
            
            # Пишем обратно
            with sftp.file(file_path, 'w') as f:
                f.write(content)
            
            print(f"✅ Исправлен {file_path}")
        else:
            print(f"⏭️ Уже исправлен {file_path}")
    except FileNotFoundError:
        print(f"❌ Файл не найден {file_path}")

sftp.close()

# Перестраиваем
print("\n📦 Собираю проект...")
stdin, stdout, stderr = ssh.exec_command('cd /var/www/spor3s-app && npm run build 2>&1 | tail -10')
output = stdout.read().decode()
print(output)

ssh.close()
