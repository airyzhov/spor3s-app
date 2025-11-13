#!/bin/bash
# Скрипт для добавления SSH ключа на VPS
# Запустить на VPS: bash vps_add_key_script.sh

PUB_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPzNkCTBK5f7qgcmT/v/Yx6yXjo+Jr2o3fbzlQbxHUXX github-actions-spor3s"

echo "Добавление SSH ключа GitHub Actions на VPS..."

mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Проверяем, есть ли уже этот ключ
if grep -q "github-actions-spor3s" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "Ключ уже добавлен"
else
    echo "$PUB_KEY" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
    echo "Ключ добавлен успешно"
fi

echo "Проверка..."
cat ~/.ssh/authorized_keys | grep github-actions

