import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', port=2222, username='root', password='qXY.W3,,Be?@gb', timeout=15)

def run_cmd(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.recv_exit_status()
    return stdout.read().decode() + stderr.read().decode()

print('=== 1. Добавление товара 4v1-6 через curl ===')

# Add product via direct API call using service key
result = run_cmd('''
cd /var/www/spor3s-app/spor3s-app && \
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2 | tr -d '"' | tr -d "'" | head -1) && \
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2 | tr -d '"' | tr -d "'" | head -1) && \
echo "URL: $SUPABASE_URL" && \
curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"id":"4v1-6","name":"4 в 1 (6 месяцев)","price":16000,"description":"Комплексный курс на 6 месяцев: Ежовик + Мухомор + Кордицепс + Цистозира. Максимальный эффект!","image":"/products/4v1.jpg"}'
''')
print(result)

print('\n=== 2. Verify product added ===')
result = run_cmd('''
cd /var/www/spor3s-app/spor3s-app && \
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2 | tr -d '"' | tr -d "'" | head -1) && \
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2 | tr -d '"' | tr -d "'" | head -1) && \
curl -s "$SUPABASE_URL/rest/v1/products?id=eq.4v1-6" \
  -H "apikey: $ANON_KEY"
''')
print(result)

ssh.close()
print('\n✅ Done!')
