import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('185.166.197.49', port=2222, username='root', password='qXY.W3,,Be?@gb', timeout=15)

def run_cmd(cmd, timeout=180):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.recv_exit_status()
    return stdout.read().decode() + stderr.read().decode()

print('=== 1. Fix TypeScript file directly on VPS ===')
fix_file = """import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'OK', 
    message: 'AI API test route works!',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ 
      status: 'OK', 
      message: 'AI API test POST works!',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
"""

# Write fixed file
run_cmd(f"cat > /var/www/spor3s-app/spor3s-app/app/api/ai/test/route.ts << 'EOFTS'\n{fix_file}\nEOFTS")
result = run_cmd('cat /var/www/spor3s-app/spor3s-app/app/api/ai/test/route.ts | head -5')
print('File content:', result)

print('\n=== 2. Rebuild ===')
result = run_cmd('cd /var/www/spor3s-app/spor3s-app && npm run build 2>&1 | tail -15', timeout=300)
print(result)

print('\n=== 3. Restart PM2 ===')
result = run_cmd('pm2 restart spor3s-nextjs && sleep 3 && pm2 status | grep spor3s')
print(result)

print('\n=== 4. Test AI API ===')
result = run_cmd('curl -s -X POST https://ai.spor3s.ru/api/ai -H "Content-Type: application/json" -d \'{"message":"привет"}\' 2>&1 | head -200')
print(result)

ssh.close()
print('\n✅ Done!')
