const { createMocks } = require('node-mocks-http');
const handler = require('../../app/api/generate-auth-code/route');
const supabase = require('../../app/supabaseServerClient');

jest.mock('../../app/supabaseServerClient', () => {
  let codes = [];
  return {
    supabaseServer: {
      from: jest.fn(() => ({
        insert: jest.fn((rows) => {
          codes.push(...rows);
          return { error: null };
        }),
      })),
    },
  };
});

describe('API /api/generate-auth-code', () => {
  it('генерирует и сохраняет auth-код', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', telegram_id: 'tg1' },
    });
    // @ts-ignore
    await handler.POST(req, res);
    const data = res._getJSONData();
    expect(data.auth_code).toHaveLength(6);
    expect(res.statusCode).toBe(200);
  });
}); 