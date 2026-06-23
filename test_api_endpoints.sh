# Test Initialization and Products API

# 1. Test /api/init-user with a fake Telegram ID
curl -X POST http://localhost:3000/api/init-user \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": "123456789", "referral_code": "test_ref"}'

echo -e "\n\n"

# 2. Test /api/products
curl http://localhost:3000/api/products

