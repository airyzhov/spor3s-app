#!/bin/bash
# Исправление SSH конфигурации на VPS
# Запустить на VPS: bash fix_ssh_config.sh

echo "Исправление SSH конфигурации..."

# Удаляем строку с usedns из SSH config
if [ -f ~/.ssh/config ]; then
    sed -i '/^[^#]*usedns/d' ~/.ssh/config
    echo "✅ Удалена опция usedns из ~/.ssh/config"
else
    echo "⚠️ Файл ~/.ssh/config не найден"
fi

# Проверяем ключ
echo ""
echo "Проверка SSH ключа GitHub Actions:"
if grep -q "github-actions-spor3s" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "✅ Ключ найден в authorized_keys"
    grep "github-actions-spor3s" ~/.ssh/authorized_keys
else
    echo "❌ Ключ не найден"
fi

# Проверяем права
chmod 600 ~/.ssh/authorized_keys 2>/dev/null
chmod 700 ~/.ssh 2>/dev/null

echo ""
echo "✅ Настройка завершена"

