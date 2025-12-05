import paramiko
import time
import socket

socket.setdefaulttimeout(120)

for attempt in range(5):
    try:
        print(f'Attempt {attempt + 1}...')
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect('185.166.197.49', port=2222, username='root', password='qXY.W3,,Be?@gb', 
                    timeout=120, banner_timeout=120, auth_timeout=120)
        print('✅ Connected!')
        break
    except Exception as e:
        print(f'❌ Failed: {type(e).__name__}')
        time.sleep(10)
else:
    exit(1)

def run_cmd(cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.recv_exit_status()
    return stdout.read().decode() + stderr.read().decode()

# 1. Check Nginx error
print('=== Nginx Error Log ===')
print(run_cmd('tail -10 /var/log/nginx/error.log'))

# 2. Check if Next.js is responding internally
print('\n=== Internal Next.js Test ===')
print(run_cmd('curl -s http://127.0.0.1:3000/ | head -c 100'))

# 3. Check Nginx config
print('\n=== Nginx Config ===')
print(run_cmd('cat /etc/nginx/sites-enabled/spor3s 2>/dev/null | head -30 || cat /etc/nginx/sites-enabled/default | head -30'))

# 4. Check spor3z-client event handler
print('\n=== Event Handler Code ===')
print(run_cmd('grep -A20 "client.addEventHandler" /var/www/spor3s-app/tg-client/client.js | head -25'))

ssh.close()
