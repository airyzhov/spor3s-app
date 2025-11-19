#!/usr/bin/env python3
"""
Автоматический деплой исправлений для устранения ошибки загрузки
"""
import paramiko
import sys
import time

VPS_HOST = "185.166.197.49"
VPS_USER = "root"
VPS_PATH = "/var/www/spor3s-app"

def deploy_fix():
    print("🚀 Автоматический деплой исправлений ошибки загрузки")
    print("═══════════════════════════════════════════════════════")
    print()
    
    # Подключаемся к VPS
    print(f"📡 Подключение к VPS {VPS_HOST}...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(VPS_HOST, username=VPS_USER, timeout=15)
        print("✅ Подключено успешно")
        print()
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        print("💡 Убедитесь, что:")
        print("   - VPS доступен")
        print("   - SSH доступен на порту 22")
        print("   - Используется правильный пользователь (root)")
        sys.exit(1)
    
    try:
        # Команды для выполнения на VPS
        commands = [
            f"cd {VPS_PATH}",
            "echo '📥 Получение обновлений из GitHub...'",
            "git pull origin main",
            "echo ''",
            "echo '📦 Очистка кэша Next.js...'",
            "rm -rf .next",
            "echo ''",
            "echo '🏗️ Сборка Next.js приложения...'",
            "npm run build",
            "echo ''",
            "echo '🛑 Остановка старых процессов...'",
            "pm2 stop spor3s-nextjs 2>/dev/null || echo '⚠️ Процесс не найден'",
            "pm2 delete spor3s-nextjs 2>/dev/null || echo '⚠️ Процесс не найден'",
            "sleep 2",
            "echo ''",
            "echo '🔄 Запуск Next.js приложения...'",
            "pm2 start npm --name 'spor3s-nextjs' -- start",
            "pm2 save",
            "sleep 3",
            "echo ''",
            "echo '🔄 Перезапуск Nginx...'",
            "systemctl restart nginx",
            "sleep 2",
            "echo ''",
            "echo '📊 Статус процессов PM2:'",
            "pm2 status",
            "echo ''",
            "echo '📋 Последние логи (первые 30 строк):'",
            "pm2 logs spor3s-nextjs --lines 30 --nostream",
            "echo ''",
            "echo '🔍 Проверка доступности приложения...'",
            "sleep 2",
            "curl -s -o /dev/null -w 'HTTP Status: %{http_code}\\n' http://localhost:3000 || echo '⚠️ Приложение не отвечает'",
        ]
        
        full_command = " && ".join(commands)
        print("⏳ Выполнение команд на VPS...")
        print()
        
        stdin, stdout, stderr = ssh.exec_command(full_command)
        
        # Выводим результат в реальном времени
        print("📤 Вывод команд:")
        print("-" * 60)
        for line in stdout:
            print(line.rstrip())
        
        errors = stderr.read().decode('utf-8', errors='ignore')
        if errors:
            print()
            print("⚠️ Ошибки:")
            print(errors)
        
        exit_status = stdout.channel.recv_exit_status()
        
        ssh.close()
        
        print()
        print("-" * 60)
        print("═══════════════════════════════════════════════════════")
        if exit_status == 0:
            print("✅ Деплой завершен успешно!")
            print()
            print("🧪 Проверьте работу приложения:")
            print("   - https://ai.spor3s.ru")
            print("   - Откройте в браузере и проверьте, что страница загружается")
            print()
            print("📋 Полезные команды для проверки:")
            print("   - pm2 logs spor3s-nextjs - просмотр логов")
            print("   - pm2 status - статус процессов")
            print("   - curl http://localhost:3000 - проверка локально")
        else:
            print(f"⚠️ Деплой завершен с кодом выхода: {exit_status}")
            print("Проверьте логи выше для диагностики проблем")
        print()
        
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    deploy_fix()

