const { createMocks } = require('node-mocks-http');
const handler = require('../../app/api/order-simple/route');
const supabase = require('../../app/supabaseServerClient');

jest.mock('../../app/supabaseServerClient', () => {
  return {
    supabaseServer: {
      from: jest.fn(() => ({
        insert: jest.fn((rows) => ({
          data: rows.map((row) => ({ ...row, id: 'order-uuid' })),
          error: null,
        })),
      })),
    },
  };
});

describe('API /api/order-simple', () => {
  it('создаёт заказ с подарком при total > 4000', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', items: [], total: 5000 },
    });
    // @ts-ignore
    await handler.POST(req, res);
    const data = res._getJSONData();
    expect(data.order.gift).toBe('цистозира');
    expect(res.statusCode).toBe(200);
  });
  it('создаёт заказ без подарка при total <= 4000', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', items: [], total: 3000 },
    });
    // @ts-ignore
    await handler.POST(req, res);
    const data = res._getJSONData();
    expect(data.order.gift).toBeNull();
    expect(res.statusCode).toBe(200);
  });
}); 