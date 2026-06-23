const { getOrCreateUser } = require('../../lib/initUserHandler');

jest.mock('@supabase/supabase-js', () => {
  const users = [];
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: (_field, value) => ({
            single: () => {
              const user = users.find(u => u.telegram_id === value);
              return { data: user || null, error: null };
            }
          })
        }),
        insert: (rows) => ({
          select: () => ({
            single: () => {
              const newUser = { id: 'uuid-mock', telegram_id: rows[0].telegram_id };
              users.push(newUser);
              return { data: newUser, error: null };
            }
          })
        })
      })
    })
  };
});

describe('getOrCreateUser', () => {
  it('создаёт нового пользователя и возвращает id', async () => {
    const id = await getOrCreateUser('12345');
    expect(id).toBe('uuid-mock');
  });
  it('возвращает id существующего пользователя', async () => {
    await getOrCreateUser('12345'); // создаём
    const id = await getOrCreateUser('12345'); // ищем
    expect(id).toBe('uuid-mock');
  });
  it('кидает ошибку, если telegram_id не передан', async () => {
    await expect(getOrCreateUser('')).rejects.toThrow('telegram_id required');
  });
}); 