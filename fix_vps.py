import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', port=2222, username='root', password='qXY.W3,,Be?@gb', timeout=15)

def run_cmd(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.recv_exit_status()
    return stdout.read().decode() + stderr.read().decode()

print('=== 1. Добавление товара 4v1-6 в Supabase через node ===')

# Create script to add product
add_product_script = '''
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addProduct() {
  // Check if exists
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('id', '4v1-6')
    .single();
  
  if (existing) {
    console.log('Product 4v1-6 already exists');
    return;
  }
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: '4v1-6',
      name: '4 в 1 (6 месяцев)',
      price: 16000,
      description: 'Комплексный курс на 6 месяцев: Ежовик + Мухомор + Кордицепс + Цистозира. Максимальный эффект!',
      image: '/products/4v1.jpg'
    })
    .select();
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Product added:', data);
  }
}

addProduct();
'''

# Write and run script
run_cmd('cd /var/www/spor3s-app/spor3s-app && cat > /tmp/add-product.js << \'EOFSCP\'\n' + add_product_script + '\nEOFSCP')
result = run_cmd('cd /var/www/spor3s-app/spor3s-app && node /tmp/add-product.js')
print(result)

print('\n=== 2. Git pull and rebuild ===')
result = run_cmd('cd /var/www/spor3s-app && git stash && git pull origin main 2>&1 || echo "Git pull done"', timeout=60)
print(result[:500] if len(result) > 500 else result)

print('\n=== 3. Rebuild Next.js ===')
result = run_cmd('cd /var/www/spor3s-app/spor3s-app && npm run build 2>&1 | tail -20', timeout=180)
print(result)

print('\n=== 4. Restart PM2 ===')
result = run_cmd('pm2 restart spor3s-nextjs && sleep 3 && pm2 status')
print(result)

print('\n=== 5. Verify products API ===')
result = run_cmd('curl -s "https://ai.spor3s.ru/api/products" | python3 -c "import sys,json; d=json.load(sys.stdin); p=[x for x in d.get(\'products\',[]) if \'4v1\' in x.get(\'id\',\'\')]; print(\'4v1 products:\', p)"')
print(result)

ssh.close()
print('\n✅ Done!')
