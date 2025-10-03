import { getOrCreateUser } from './initUserHandler';

async function test() {
  try {
    const id = await getOrCreateUser('test-12345');
    console.log('User ID:', id);
  } catch (e) {
    console.error('Error:', e);
  }
}

test(); 