/**
 * @jest-environment node
 */
import { isGamificationTester } from '../testers';

// Скрытые разделы кабинета видит только владелец (@web3grow), остальные — нет.
it('владелец — тестировщик, покупатели и гости — нет', () => {
  expect(isGamificationTester('5554098114')).toBe(true);
  expect(isGamificationTester(5554098114)).toBe(true);
  expect(isGamificationTester('54993853')).toBe(false);
  expect(isGamificationTester('guest-1')).toBe(false);
  expect(isGamificationTester(undefined)).toBe(false);
});
