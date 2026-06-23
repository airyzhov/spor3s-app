import os
from supabase import create_client

# Read credentials from env.local
url = None
key = None

with open('env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
            url = line.split('=', 1)[1].strip().strip('"').strip("'")
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            key = line.split('=', 1)[1].strip().strip('"').strip("'")

print(f'URL: {url}')
print(f'Key: {key[:30]}...' if key else 'No key found')

if url and key:
    supabase = create_client(url, key)
    
    # Check if exists
    result = supabase.table('products').select('id').eq('id', '4v1-6').execute()
    
    if result.data:
        print('Product 4v1-6 already exists!')
    else:
        # Insert
        result = supabase.table('products').insert({
            'id': '4v1-6',
            'name': '4 в 1 (6 месяцев)',
            'price': 16000,
            'description': 'Комплексный курс на 6 месяцев: Ежовик + Мухомор + Кордицепс + Цистозира. Максимальный эффект!',
            'image': '/products/4v1.jpg'
        }).execute()
        
        print('Product added:', result.data)
else:
    print('Missing URL or Key')

