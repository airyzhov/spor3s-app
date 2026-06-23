// Быстрый тест emergency server
const http = require('http');

async function testEmergencyServer() {
    console.log('🚀 Тестирую Emergency Server...');
    
    // Тест подключения
    console.log('\n1️⃣ Проверка подключения к localhost:3000...');
    
    const postData = JSON.stringify({
        message: 'хочу ежовик на месяц',
        user_id: 'test-user',
        telegram_id: '123456'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/test-api',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log(`✅ Статус: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('📨 Ответ:', JSON.stringify(response, null, 2));
                    resolve(response);
                } catch (error) {
                    console.log('📨 Raw ответ:', data);
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Ошибка:', error.message);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

testEmergencyServer()
    .then(() => console.log('✅ Тест завершен'))
    .catch(err => console.error('❌ Тест провалился:', err.message));
