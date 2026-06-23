#!/bin/bash
cd /var/www/spor3s-app
SESSION=$(cat tg_login_session.txt)
cd spor3s-app
sed -i '/TELEGRAM_SESSION_STRING/d' .env.local
echo "TELEGRAM_SESSION_STRING=$SESSION" >> .env.local
echo "Session added!"
tail -1 .env.local | head -c 80

