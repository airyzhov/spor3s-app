/**
 * @jest-environment node
 */
import {
  GUIDE_LESSONS,
  GUIDE_REWARD_SC,
  GUIDE_SOURCE,
  GUIDE_DESCRIPTION,
  checkGuideAnswers,
  restoreGuideProgress,
  guideStorageKey,
  type GuideLesson,
} from '../newbieGuide';

// Гид новичка (02.10): 7 коротких уроков, после каждого вопрос с тремя вариантами; верный ответ
// открывает следующий урок, за прохождение +100 SC. Тексты согласованы с владельцем в чате.

const CORRECT = [1, 0, 2, 1, 2, 0, 1];
const lessonText = (l: GuideLesson) =>
  l.blocks.map((b) => [b.lead, b.kind === 'p' ? b.text : b.items.join(' ')].filter(Boolean).join(' ')).join(' ');

describe('уроки', () => {
  it('7 уроков с уникальными id, по три варианта ответа', () => {
    expect(GUIDE_LESSONS.map((l) => l.id)).toEqual(['basics', 'ezhovik', 'muhomor', 'kordiceps', 'cistozira', 'start', 'choose']);
    for (const l of GUIDE_LESSONS) {
      expect(l.question.options).toHaveLength(3);
      expect(l.question.hint.length).toBeGreaterThan(10);
    }
  });

  it('верный ответ стоит на разных местах', () => {
    expect(GUIDE_LESSONS.map((l) => l.question.correct)).toEqual(CORRECT);
  });

  it('видео — у ежовика и мухомора', () => {
    const videos = Object.fromEntries(GUIDE_LESSONS.map((l) => [l.id, l.video?.youtubeId ?? null]));
    expect(videos).toEqual({
      basics: null, ezhovik: 'LOAIu2viFgo', muhomor: 'H4ry6oER5Cc', kordiceps: null, cistozira: null, start: null, choose: null,
    });
  });

  it('строка про БАД под уроками, у мухомора — своя', () => {
    for (const l of GUIDE_LESSONS) {
      if (l.id === 'muhomor') expect(l.note).toBe('Рассказы участников опроса — не рекомендация к применению. Посоветуйтесь с врачом.');
      else expect(l.note).toBe('БАД. Не является лекарственным средством.');
    }
  });

  it('суммы в текстах — из констант магазина', () => {
    const byId = (id: string) => lessonText(GUIDE_LESSONS.find((l) => l.id === id)!);
    expect(byId('basics')).toContain('получите 100 SC — это 100 ₽ скидки');
    expect(byId('start')).toContain('+25 SC');
    expect(byId('choose')).toContain('за подписку +30 SC');
    expect(byId('choose')).toContain('до 30% заказа');
  });

  it('мухомор: нельзя с алкоголем, без граммов', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'muhomor')!);
    expect(text).toContain('с алкоголем');
    // \b в JS не видит границу у кириллицы — поэтому «после г не буква»
    expect(text).not.toMatch(/\d\s*(г|гр|грамм)(?![а-яё])/i);
    expect('по 1 г утром').toMatch(/\d\s*(г|гр|грамм)(?![а-яё])/i);
  });
});

describe('награда', () => {
  it('100 SC, своя метка операции', () => {
    expect(GUIDE_REWARD_SC).toBe(100);
    expect(GUIDE_SOURCE).toBe('newbie_guide');
    expect(GUIDE_DESCRIPTION).toBe('Гид новичка пройден');
  });
});

describe('checkGuideAnswers — проверка ответов на сервере', () => {
  it('все верные — да', () => {
    expect(checkGuideAnswers(CORRECT)).toBe(true);
  });

  it('один неверный, не все, лишние, не массив, дроби — нет', () => {
    expect(checkGuideAnswers([1, 0, 2, 1, 2, 0, 2])).toBe(false);
    expect(checkGuideAnswers(CORRECT.slice(0, 6))).toBe(false);
    expect(checkGuideAnswers([...CORRECT, 1])).toBe(false);
    expect(checkGuideAnswers('1021201')).toBe(false);
    expect(checkGuideAnswers(null)).toBe(false);
    expect(checkGuideAnswers([1.0001, 0, 2, 1, 2, 0, 1])).toBe(false);
  });
});

describe('restoreGuideProgress — прогресс из хранилища', () => {
  it('пусто или мусор — с начала', () => {
    expect(restoreGuideProgress(null)).toEqual([]);
    expect(restoreGuideProgress('')).toEqual([]);
    expect(restoreGuideProgress('не json')).toEqual([]);
    expect(restoreGuideProgress('{"a":1}')).toEqual([]);
  });

  it('верные ответы по порядку — продолжаем с них', () => {
    expect(restoreGuideProgress('[1,0,2]')).toEqual([1, 0, 2]);
    expect(restoreGuideProgress(JSON.stringify(CORRECT))).toEqual(CORRECT);
  });

  it('обрезаем на первом неверном и лишнем', () => {
    expect(restoreGuideProgress('[1,2,2]')).toEqual([1]);
    expect(restoreGuideProgress(JSON.stringify([...CORRECT, 1, 1]))).toEqual(CORRECT);
  });

  it('ключ хранилища — по пользователю', () => {
    expect(guideStorageKey('u-1')).toBe('spor3s_guide_v1:u-1');
  });
});
