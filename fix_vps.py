import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', port=2222, username='root', password='qXY.W3,,Be?@gb', timeout=15)

def run_cmd(cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.recv_exit_status()
    return stdout.read().decode() + stderr.read().decode()

print('=== Проверка товара 4v1-6 ===\n')

result = run_cmd('curl -s https://ai.spor3s.ru/api/products 2>&1')
try:
    data = json.loads(result)
    products = data.get('products', [])
    
    # Find 4v1-6
    p4v16 = next((p for p in products if p.get('id') == '4v1-6'), None)
    
    if p4v16:
        print(f'✅ Товар 4v1-6 НАЙДЕН:')
        print(f'   ID: {p4v16["id"]}')
        print(f'   Название: {p4v16["name"]}')
        print(f'   Цена: {p4v16["price"]}₽')
        print(f'   Описание: {p4v16.get("description", "нет")}')
    else:
        print('❌ Товар 4v1-6 НЕ найден в API')
        print('\nВсе 4v1 товары:')
        for p in products:
            if '4v1' in p.get('id', ''):
                print(f'   {p["id"]}: {p["name"]} - {p["price"]}₽')
except Exception as e:
    print(f'Ошибка: {e}')

ssh.close()
