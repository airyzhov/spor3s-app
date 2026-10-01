/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ReferralPanel from '../ReferralPanel';
import { REFERRAL_TERMS } from '../../../lib/referralLink';

// Панель приглашения под строкой «👥 Пригласи друга» в «Как получить SC» — бывший раздел
// «🎁 Реферальная система» (01.10): условия, кто пригласил / код друга, ссылка, свой код, приглашённые.

const TG_ID = '54993853';
const USER_ID = '11111111-2222-4333-8444-555555555555';

const stats = (over: object = {}) => ({
  referralCode: '@Lopata03',
  referralEarned: 12,
  totalReferrals: 1,
  invitedBy: null,
  canEnterInviterCode: false,
  referrals: [{ id: 'r1', status: 'completed', scEarned: 12, referred_user: { username: 'friend', telegram_id: '7000000001' } }],
  ...over,
});

const renderPanel = (props: Partial<React.ComponentProps<typeof ReferralPanel>> = {}) =>
  render(
    <ReferralPanel
      userId={USER_ID}
      telegramId={TG_ID}
      stats={stats()}
      referralCode="@Lopata03"
      invitedCount={1}
      referralBonus={12}
      onClaimed={jest.fn()}
      {...props}
    />,
  );

it('условия, персональная ссылка с «Скопировать» и «Поделиться», свой код', () => {
  renderPanel();
  expect(screen.getByText(REFERRAL_TERMS)).toBeInTheDocument();
  expect(screen.getByText(`https://t.me/spor3sbot?start=${TG_ID}`)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '📋 Скопировать' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '📤 Поделиться' })).toBeInTheDocument();
  expect(screen.getByText('Или ваш код — друг введёт его в кабинете или при заказе:')).toBeInTheDocument();
  expect(screen.getByText('@Lopata03')).toBeInTheDocument();
});

it('статистика и список приглашённых', () => {
  renderPanel();
  expect(screen.getByText('12₽')).toBeInTheDocument();
  expect(screen.getByText('👤 @friend')).toBeInTheDocument();
  expect(screen.getByText('✅ активен · принёс 12 SC')).toBeInTheDocument();
});

it('гостю без Telegram — подсказка открыть через бота вместо ссылки', () => {
  renderPanel({ telegramId: 'guest-1' });
  expect(screen.getByText(/появится здесь, если открыть/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '📤 Поделиться' })).toBeNull();
});

it('кто пригласил — строкой; ещё не покупал и без пригласившего — поле «Код друга»', () => {
  const { unmount } = renderPanel({ stats: stats({ invitedBy: { name: '@web3grow', welcomeSc: 100 } }) });
  expect(screen.getByText('🤝 Вас пригласил @web3grow · 🎁 +100 SC')).toBeInTheDocument();
  unmount();
  renderPanel({ stats: stats({ canEnterInviterCode: true }) });
  expect(screen.getByLabelText('Код друга')).toBeInTheDocument();
});
