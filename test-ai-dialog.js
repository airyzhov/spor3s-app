#!/usr/bin/env node
/**
 * Тестирование AI диалогов с контекстом
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/ai';

// Тестовые сценарии
const testScenarios = [
  {
    name: 'Сценарий 1: Продолжение темы (ежовик → порошок)',
    messages: [
      { role: 'user', content: 'хочу ежовик' },
      { role: 'user', content: 'порошок' }
    ]
  },
  {
    name: 'Сценарий 2: Без повторного приветствия',
    messages: [
      { role: 'user', content: 'привет' },
      { role: 'user', content: 'мухомор' }
    ]
  },
  {
    name: 'Сценарий 3: Уточнение деталей',
    messages: [
      { role: 'user', content: 'что помогает со сном?' },
      { role: 'user', content: 'а в капсулах есть?' }
    ]
  },
  {
    name: 'Сценарий 4: Полный диалог заказа',
    messages: [
      { role: 'user', content: 'хочу ежовик для памяти' },
      { role: 'user', content: 'порошок' },
      { role: 'user', content: 'на 3 месяца' }
    ]
  },
  {
    name: 'Сценарий 5: Краткие ответы',
    messages: [
      { role: 'user', content: 'мухомор' },
      { role: 'user', content: 'капсулы' },
      { role: 'user', content: 'месяц' }
    ]
  }
];

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ ok: true, data: JSON.parse(body) });
          } catch (e) {
            resolve({ ok: true, data: { response: body } });
          }
        } else {
          resolve({ ok: false, status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testDialog(scenario) {
  console.log('\n' + '='.repeat(70));
  console.log(`🧪 ${scenario.name}`);
  console.log('='.repeat(70));

  const context = [];

  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    
    console.log(`\n👤 USER: ${message.content}`);

    try {
      const response = await makeRequest(API_URL, {
        message: message.content,
        context: context,
        source: 'test',
        user_id: 'test-user-123'
      });

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status}`);
        console.error(response.body);
        return;
      }

      const data = response.data;
      const aiResponse = data.response || 'No response';

      console.log(`🤖 BOT: ${aiResponse}`);

      // Добавляем в контекст для следующего сообщения
      context.push({ role: 'user', content: message.content });
      context.push({ role: 'assistant', content: aiResponse });

      // Проверяем на проблемы
      const issues = [];
      
      if (i > 0 && aiResponse.toLowerCase().includes('привет')) {
        issues.push('⚠️ ПРОБЛЕМА: Повторное приветствие!');
      }
      
      if (i > 0 && /добро пожаловать|я консультант|помогу выбрать/i.test(aiResponse)) {
        issues.push('⚠️ ПРОБЛЕМА: Шаблонное начало диалога!');
      }
      
      if (i > 0 && aiResponse.includes('🧠 Ежовик') && aiResponse.includes('😴 Мухомор') && aiResponse.includes('⚡ Кордицепс')) {
        issues.push('⚠️ ПРОБЛЕМА: Полный список продуктов (должен продолжать разговор)!');
      }

      if (issues.length > 0) {
        console.log('\n' + issues.join('\n'));
      } else if (i > 0) {
        console.log('\n✅ OK: Продолжает разговор без повторений');
      }

      // Пауза между сообщениями
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
  }

  console.log('\n' + '─'.repeat(70));
}

async function runAllTests() {
  console.log('\n🚀 ТЕСТИРОВАНИЕ AI ДИАЛОГОВ');
  console.log(`📡 API: ${API_URL}`);
  console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}`);

  for (const scenario of testScenarios) {
    await testDialog(scenario);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ');
  console.log('='.repeat(70) + '\n');
}

// Запуск тестов
runAllTests().catch(console.error);

