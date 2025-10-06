#!/usr/bin/env python3
"""
Генерация session string для Telegram
Используйте этот скрипт для получения session string
"""

from telethon import TelegramClient
from telethon.sessions import StringSession
import asyncio

# API данные уже получены
API_ID = 25152508
API_HASH = 'e6d11fbfdac29ec3f8e9f6eb4dc54385'

async def generate_session():
    print("🤖 Генерация session string для @web3grow")
    print("=" * 50)
    print(f"API_ID: {API_ID}")
    print(f"API_HASH: {API_HASH}")
    print()
    
    # Создаем клиент
    client = TelegramClient(StringSession(), API_ID, API_HASH)
    
    try:
        print("🔐 Начинаем авторизацию...")
        await client.start()
        
        print("✅ Авторизация успешна!")
        print("📝 Session string:")
        print("=" * 50)
        print(client.session.save())
        print("=" * 50)
        print()
        print("💡 Скопируйте этот session string и добавьте в .env.local")
        print("TELEGRAM_SESSION_STRING=ваш_session_string")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        print()
        print("💡 Альтернативные способы:")
        print("1. Используйте другой номер телефона")
        print("2. Попробуйте через веб-версию Telegram")
        print("3. Используйте готовый session string")
        
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(generate_session()) 