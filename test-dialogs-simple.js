const http = require('http');

// Тестовые диалоги
const tests = [
  {
    name: 'Тест 1: ежовик → порошок',
    dialog: [
      'хочу ежовик',
      'порошок'
    ]
  },
  {
    name: 'Тест 2: привет → мухомор',
    dialog: [
      'привет',
      'мухомор'
    ]
  },
  {
    name: 'Тест 3: сон → капсулы',
    dialog: [
      'что помогает со сном?',
      'а в капсулах есть?'
    ]
  }
];

function sendMessage(message, context) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message,
      context,
      source: 'test',
      user_id: 'test-123'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.response || body);
        } catch(e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTest(test) {
  console.log('\n' + '='.repeat(70));
  console.log(`🧪 ${test.name}`);
  console.log('='.repeat(70));

  const context = [];

  for (let i = 0; i < test.dialog.length; i++) {
    const userMsg = test.dialog[i];
    console.log(`\n👤 USER: ${userMsg}`);

    try {
      const botReply = await sendMessage(userMsg, context);
      console.log(`🤖 BOT: ${botReply.substring(0, 300)}...`);

      // Проверка на проблемы
      if (i > 0) {
        const problems = [];
        
        if (/привет|здравствуй/i.test(botReply)) {
          problems.push('⚠️ ПРОБЛЕМА: Повторное приветствие');
        }
        
        if (/я консультант|помогу выбрать/i.test(botReply)) {
          problems.push('⚠️ ПРОБЛЕМА: Шаблонное начало');
        }
        
        if (botReply.includes('🧠 Ежовик') && botReply.includes('😴 Мухомор') && botReply.includes('⚡ Кордицепс')) {
          problems.push('⚠️ ПРОБЛЕМА: Полный каталог (должен продолжать разговор)');
        }

        if (problems.length > 0) {
          console.log('\n' + problems.join('\n'));
        } else {
          console.log('\n✅ OK: Продолжает диалог без повторений');
        }
      }

      context.push({ role: 'user', content: userMsg });
      context.push({ role: 'assistant', content: botReply });

      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
      break;
    }
  }
}

async function main() {
  console.log('\n🚀 ТЕСТИРОВАНИЕ AI ДИАЛОГОВ');
  console.log('📡 API: http://localhost:3000/api/ai\n');

  for (const test of tests) {
    await runTest(test);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ТЕСТЫ ЗАВЕРШЕНЫ');
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);

