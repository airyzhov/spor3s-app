// Добавление готового session string
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addSessionString() {
  console.log('🔑 ДОБАВЛЕНИЕ ГОТОВОГО SESSION STRING');
  console.log('=====================================');
  console.log();

  try {
    // Запрашиваем session string
    const sessionString = await question('📝 Вставьте готовый session string для @spor3z: ');
    
    if (!sessionString || sessionString.trim() === '') {
      console.log('❌ Session string не может быть пустым');
      return;
    }

    // Читаем текущий .env.local
    let envContent = '';
    if (fs.existsSync('.env.local')) {
      envContent = fs.readFileSync('.env.local', 'utf8');
    }

    // Удаляем старый TELEGRAM_SESSION_STRING если есть
    envContent = envContent.replace(/TELEGRAM_SESSION_STRING=.*\n?/g, '');

    // Добавляем новый session string
    const newSessionLine = `TELEGRAM_SESSION_STRING=${sessionString.trim()}\n`;
    envContent += newSessionLine;

    // Записываем обратно в файл
    fs.writeFileSync('.env.local', envContent);

    console.log('✅ Session string добавлен в .env.local');
    console.log();

    // Проверяем session string
    console.log('🧪 Проверяем session string...');
    const { execSync } = require('child_process');
    try {
      execSync('node check-existing-session.js', { stdio: 'inherit' });
    } catch (error) {
      console.log('❌ Session string не работает. Проверьте правильность.');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    rl.close();
  }
}

// Запуск
addSessionString().catch(console.error);
