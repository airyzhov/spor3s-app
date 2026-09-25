/**
 * @jest-environment node
 */
import { courseWeek, nextCourseReport, courseStartNotice, parseCourseDuration, cabinetFocusFromUrl, COURSE_START_TEXT, COURSE_APP_URL } from '../course';
import { ORDER_STATUS_LABELS } from '../orderStatus';

// «Мой курс»: одна кнопка «Я начал(а) курс», дальше еженедельные отчёты о самочувствии.
// Недели — от даты старта (как в /api/survey): будущую неделю не заполнить, пропущенную можно досдать.

const START = '2026-09-25T10:00:00.000Z';
const at = (days: number) => new Date(Date.parse(START) + days * 24 * 60 * 60 * 1000);

describe('courseWeek', () => {
  it('неделя курса от даты старта', () => {
    expect(courseWeek(START, at(0))).toBe(1);
    expect(courseWeek(START, at(6.9))).toBe(1);
    expect(courseWeek(START, at(7))).toBe(2);
    expect(courseWeek(START, at(30))).toBe(5);
  });
});

describe('nextCourseReport', () => {
  it('первый отчёт доступен сразу', () => {
    expect(nextCourseReport(START, [], at(0))).toEqual({ week: 1, available: true, opensAt: START });
  });

  it('за эту неделю отчёт есть — следующий откроется с началом следующей недели', () => {
    expect(nextCourseReport(START, [1], at(3))).toEqual({
      week: 2, available: false, opensAt: new Date(Date.parse(START) + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  it('пропущенную неделю можно досдать — берётся первая незаполненная', () => {
    expect(nextCourseReport(START, [1, 3], at(22)).week).toBe(2);
    expect(nextCourseReport(START, [1, 3], at(22)).available).toBe(true);
  });
});

describe('courseStartNotice — бот после доставки заказа', () => {
  it('заказ стал «доставлен» — зовём отметить начало курса, кнопка ведёт в раздел курса', () => {
    const notice = courseStartNotice({ prevStatus: 'shipped', newStatus: 'completed', telegramId: '54993853', hasActiveCourse: false })!;
    expect(notice.chatId).toBe('54993853');
    expect(notice.text).toContain(COURSE_START_TEXT);
    expect(COURSE_START_TEXT).toBe('Отметьте, что вы начали курс, отслеживайте своё состояние и получайте SC каждую неделю!');
    expect(notice.buttons).toEqual([[{ text: '📊 Отметить начало курса', web_app: { url: COURSE_APP_URL } }]]);
    expect(COURSE_APP_URL).toBe('https://ai.spor3s.ru/?open=course');
  });

  it('не пишем повторно, без числового Telegram ID и тем, кто курс уже начал', () => {
    const base = { prevStatus: 'shipped', newStatus: 'completed', telegramId: '54993853', hasActiveCourse: false };
    expect(courseStartNotice({ ...base, prevStatus: 'completed' })).toBeNull();
    expect(courseStartNotice({ ...base, newStatus: 'shipped' })).toBeNull();
    expect(courseStartNotice({ ...base, telegramId: 'guest-1' })).toBeNull();
    expect(courseStartNotice({ ...base, hasActiveCourse: true })).toBeNull();
  });
});

it('статус completed называется «Доставлен»', () => {
  expect(ORDER_STATUS_LABELS.completed).toBe('✅ Доставлен');
  expect(Object.keys(ORDER_STATUS_LABELS)).toEqual(['pending', 'paid', 'shipped', 'completed', 'cancelled']);
});

describe('parseCourseDuration', () => {
  it('без срока — 1 месяц (кнопка «Я начал(а) курс» срок не спрашивает)', () => {
    expect(parseCourseDuration(undefined)).toBe(1);
    expect(parseCourseDuration(null)).toBe(1);
  });

  it('1, 3 и 6 месяцев — как раньше; другое — ошибка (null)', () => {
    expect(parseCourseDuration('3')).toBe(3);
    expect(parseCourseDuration(6)).toBe(6);
    expect(parseCourseDuration('12')).toBeNull();
  });
});

describe('cabinetFocusFromUrl — куда вести после кнопки бота', () => {
  it('?open=course — в кабинет, к разделу курса', () => {
    expect(cabinetFocusFromUrl('?open=course')).toBe('course');
    expect(cabinetFocusFromUrl('?tgWebAppStartParam=x&open=course')).toBe('course');
  });

  it('без параметра или с чужим значением — никуда', () => {
    expect(cabinetFocusFromUrl('')).toBeNull();
    expect(cabinetFocusFromUrl('?open=admin')).toBeNull();
  });
});
