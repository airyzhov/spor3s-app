const { createMocks } = require('node-mocks-http');
const handler = require('../../app/api/checkin/route');

let checkins = [];

jest.mock('../../app/supabaseServerClient', () => {
  return {
    supabaseServer: {
      from: jest.fn((table) => {
        if (table === 'daily_checkins') {
          // Мокаем цепочку eq().eq().eq().gte().lt()
          let query = { user_id: null, order_id: null, supplement_type: null, date_gte: null, date_lt: null };
          const chain = {
            eq(field, value) {
              if (field === 'user_id') query.user_id = value;
              if (field === 'order_id') query.order_id = value;
              if (field === 'supplement_type') query.supplement_type = value;
              return this;
            },
            gte(field, value) {
              if (field === 'date') query.date_gte = value;
              return this;
            },
            lt(field, value) {
              if (field === 'date') query.date_lt = value;
              // Фильтруем чек-ины по всем параметрам
              const data = checkins.filter(row =>
                (!query.user_id || row.user_id === query.user_id) &&
                (!query.order_id || row.order_id === query.order_id) &&
                (!query.supplement_type || row.supplement_type === query.supplement_type)
              );
              return { data, error: null };
            }
          };
          return {
            select: () => chain,
            insert: (row) => {
              checkins.push(row[0]);
              return { error: null };
            }
          };
        }
        // Мокаем update/select для orders/coin_transactions
        return {
          update: jest.fn(() => ({ error: null })),
          select: jest.fn(() => ({ single: jest.fn(() => ({ data: {}, error: null })) }))
        };
      })
    }
  };
});

describe('API /api/checkin', () => {
  beforeEach(() => {
    checkins = [];
  });

  it('не позволяет повторный чек-ин за день по одной добавке', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', order_id: 'o1', supplement_type: 'muhomor' },
    });
    // @ts-ignore
    await handler.POST(req, res);
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', order_id: 'o1', supplement_type: 'muhomor' },
    });
    // @ts-ignore
    await handler.POST(req2, res2);
    expect(res2._getStatusCode()).toBe(400);
    expect(res2._getData()).toMatch(/Чек-ин на сегодня по этой добавке уже сделан/);
  });

  it('разрешает чек-ин по разным добавкам в один день', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', order_id: 'o1', supplement_type: 'muhomor' },
    });
    // @ts-ignore
    await handler.POST(req, res);
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: { user_id: 'u1', order_id: 'o1', supplement_type: 'ezhovik' },
    });
    // @ts-ignore
    await handler.POST(req2, res2);
    expect(res2._getStatusCode()).not.toBe(400);
  });
}); 