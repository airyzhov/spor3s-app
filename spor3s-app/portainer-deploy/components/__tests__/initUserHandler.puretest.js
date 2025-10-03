 // Мокаем supabase-js
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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('url', 'key');

async function getOrCreateUserTest(telegram_id) {
  if (!telegram_id) {
    throw new Error('telegram_id required');
  }
  let { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegram_id)
    .single();
  if (!user) {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ telegram_id }])
      .select('id')
      .single();
    if (insertError || !newUser) {
      throw new Error(insertError?.message || 'Failed to create user');
    }
    user = newUser;
  }
  return user.id;
}

describe('getOrCreateUserTest', () => {
  it('создаёт нового пользователя и возвращает id', async () => {
    const id = await getOrCreateUserTest('12345');
    expect(id).toBe('uuid-mock');
  });
  it('возвращает id существующего пользователя', async () => {
    await getOrCreateUserTest('12345'); // создаём
    const id = await getOrCreateUserTest('12345'); // ищем
    expect(id).toBe('uuid-mock');
  });
  it('кидает ошибку, если telegram_id не передан', async () => {
    await expect(getOrCreateUserTest('')).rejects.toThrow('telegram_id required');
  });
});
