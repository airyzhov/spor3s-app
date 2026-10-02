/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GuideModal from '../GuideModal';
import { GUIDE_LESSONS, guideStorageKey } from '../../../lib/newbieGuide';

// Гид новичка (02.10): урок → вопрос с тремя вариантами → верный ответ открывает следующий урок;
// после 7-го ответы уходят на /api/guide и начисляются +100 SC. Прогресс — в localStorage.

const USER_ID = '11111111-2222-4333-8444-555555555555';
const RIGHT = GUIDE_LESSONS.map((l) => l.question.correct);
const KEY = guideStorageKey(USER_ID);

function renderGuide(props: Partial<React.ComponentProps<typeof GuideModal>> = {}) {
  const handlers = { onClose: jest.fn(), onCompleted: jest.fn(), onOpenCatalog: jest.fn() };
  render(<GuideModal userId={USER_ID} {...handlers} {...props} />);
  return handlers;
}

const option = (lesson: number, i: number) =>
  screen.getByRole('button', { name: GUIDE_LESSONS[lesson].question.options[i] });
const wrongOf = (lesson: number) => (RIGHT[lesson] + 1) % 3;
const startAt = (lesson: number) => localStorage.setItem(KEY, JSON.stringify(RIGHT.slice(0, lesson)));
const okResponse = (body: object) => ({ ok: true, json: async () => body });

beforeEach(() => {
  localStorage.clear();
  (global as any).fetch = jest.fn();
  window.open = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

it('первый урок: номер, заголовок, вопрос с тремя вариантами и строка «не лекарство»', () => {
  renderGuide();
  expect(screen.getByRole('dialog', { name: 'Что такое грибные добавки' })).toBeInTheDocument();
  expect(screen.getByText('Урок 1 из 7')).toBeInTheDocument();
  expect(screen.getByText('Когда оценивать результат?')).toBeInTheDocument();
  GUIDE_LESSONS[0].question.options.forEach((_, i) => expect(option(0, i)).toBeEnabled());
  expect(screen.getByText('Не является лекарственным средством.')).toBeInTheDocument();
});

it('неверный ответ — подсказка и «Ещё раз», дальше не пускает', () => {
  renderGuide();
  fireEvent.click(option(0, wrongOf(0)));
  expect(screen.getByText(GUIDE_LESSONS[0].question.hint)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Дальше →' })).toBeNull();
  expect(option(0, RIGHT[0])).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }));
  expect(screen.queryByText(GUIDE_LESSONS[0].question.hint)).toBeNull();
  expect(option(0, RIGHT[0])).toBeEnabled();
});

it('верный ответ — «Верно!» и «Дальше →»: второй урок с видео, прогресс сохранён', () => {
  renderGuide();
  fireEvent.click(option(0, RIGHT[0]));
  expect(screen.getByText('✅ Верно!')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Дальше →' }));

  expect(screen.getByText('Урок 2 из 7')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Ежовик' })).toBeInTheDocument();
  expect(screen.getByTitle('Видео: Ежовик')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/LOAIu2viFgo');
  expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([RIGHT[0]]);
});

it('после ответа подсказка или «Дальше» сами прокручиваются в поле зрения', () => {
  const scrollIntoView = jest.fn();
  Element.prototype.scrollIntoView = scrollIntoView;
  renderGuide();
  fireEvent.click(option(0, wrongOf(0)));
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }));
  fireEvent.click(option(0, RIGHT[0]));
  expect(scrollIntoView).toHaveBeenCalledTimes(2);
  delete (Element.prototype as any).scrollIntoView;
});

it('видео не грузится — ссылка открывает YouTube снаружи', () => {
  startAt(1);
  renderGuide();
  fireEvent.click(screen.getByRole('button', { name: 'Не грузится? Открыть на YouTube' }));
  expect(window.open).toHaveBeenCalledWith('https://youtu.be/LOAIu2viFgo', '_blank', 'noopener,noreferrer');
});

it('продолжает с того урока, где остановился', () => {
  startAt(6);
  renderGuide();
  expect(screen.getByText('Урок 7 из 7')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Как выбрать' })).toBeInTheDocument();
});

it('мухомор — своя строка вместо «не лекарство»', () => {
  startAt(2);
  renderGuide();
  expect(screen.getByRole('heading', { name: 'Мухомор' })).toBeInTheDocument();
  expect(screen.getByText('Рассказы участников опроса - не рекомендация к применению. Посоветуйтесь с врачом.')).toBeInTheDocument();
  expect(screen.queryByText('Не является лекарственным средством.')).toBeNull();
});

it('гид уже пройден — перечитать можно с первого урока', () => {
  startAt(6);
  renderGuide({ completed: true });
  expect(screen.getByText('Урок 1 из 7')).toBeInTheDocument();
});

it('без доступа к хранилищу — с начала и без ошибки', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  renderGuide();
  expect(screen.getByText('Урок 1 из 7')).toBeInTheDocument();
  fireEvent.click(option(0, RIGHT[0]));
  fireEvent.click(screen.getByRole('button', { name: 'Дальше →' }));
  expect(screen.getByText('Урок 2 из 7')).toBeInTheDocument();
});

describe('финал', () => {
  it('ответы уходят на сервер: «Гид пройден!», +100 SC, «Подобрать курс»', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue(okResponse({ success: true, credited: true, reward: 100 }));
    startAt(6);
    const { onCompleted, onOpenCatalog } = renderGuide();

    fireEvent.click(option(6, RIGHT[6]));
    fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));

    expect(await screen.findByText('🎉 Гид пройден!')).toBeInTheDocument();
    expect(screen.getByText('+100 SC - это 100 ₽ скидки на заказ')).toBeInTheDocument();
    const [url, init] = (global as any).fetch.mock.calls[0];
    expect(url).toBe('/api/guide');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ user_id: USER_ID, answers: RIGHT });
    expect(onCompleted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Подобрать курс' }));
    expect(onOpenCatalog).toHaveBeenCalled();
  });

  it('уже начисляли — без второго +100', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue(okResponse({ success: true, credited: false, reward: 100 }));
    startAt(6);
    renderGuide();
    fireEvent.click(option(6, RIGHT[6]));
    fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));
    expect(await screen.findByText('100 SC уже начислены раньше')).toBeInTheDocument();
    expect(screen.queryByText('+100 SC - это 100 ₽ скидки на заказ')).toBeNull();
  });

  it('сервер не ответил — ошибка и повтор', async () => {
    (global as any).fetch = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(okResponse({ success: true, credited: true, reward: 100 }));
    startAt(6);
    renderGuide();
    fireEvent.click(option(6, RIGHT[6]));
    fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));

    expect(await screen.findByText('Не получилось начислить SC. Попробуйте ещё раз.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Попробовать ещё раз' }));
    expect(await screen.findByText('🎉 Гид пройден!')).toBeInTheDocument();
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
  });

  it('ответ сервера «ошибка» (не 200) — тоже предлагаем повторить', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, error: 'Ответы не сходятся' }) });
    startAt(6);
    renderGuide();
    fireEvent.click(option(6, RIGHT[6]));
    fireEvent.click(screen.getByRole('button', { name: 'Получить 100 SC' }));
    expect(await screen.findByText('Не получилось начислить SC. Попробуйте ещё раз.')).toBeInTheDocument();
  });
});

it('закрыть — крестиком и Escape', () => {
  const { onClose } = renderGuide();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});
