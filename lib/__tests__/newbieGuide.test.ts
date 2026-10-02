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

  it('строка «не лекарство» под уроками, у мухомора — своя', () => {
    for (const l of GUIDE_LESSONS) {
      if (l.id === 'muhomor') expect(l.note).toBe('Рассказы участников опроса - не рекомендация к применению. Посоветуйтесь с врачом.');
      else expect(l.note).toBe('Не является лекарственным средством.');
    }
  });

  it('грибные добавки — пищевые добавки, не лекарство (правка владельца 02.10)', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'basics')!);
    expect(text).toContain('Грибные добавки - это пищевые добавки, а не лекарство.');
    expect(text).not.toContain('БАД');
  });

  it('суммы в текстах — из констант магазина', () => {
    const byId = (id: string) => lessonText(GUIDE_LESSONS.find((l) => l.id === id)!);
    expect(byId('basics')).toContain('получите 100 SC - это 100 ₽ скидки');
    expect(byId('start')).toContain('+25 SC');
    expect(byId('choose')).toContain('за подписку +30 SC');
    expect(byId('choose')).toContain('до 30% заказа');
  });

  it('мухомор: вместо тошноты — тяга к алкоголю и сигаретам, спорт; без названий болезней', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'muhomor')!);
    expect(text).not.toContain('тошнот');
    expect(text).toContain('меньше тянуло к алкоголю и сигаретам');
    expect(text).toContain('спортсмены');
    expect(text).toContain('Это рассказы самих людей, а не клиническое испытание.');
    // Закон о рекламе (38-ФЗ ст. 5 ч. 5 п. 6): не лекарству нельзя «положительное влияние на течение болезни»
    expect(text).not.toMatch(/депресс|зависимост/i);
  });

  it('мухомор: нельзя с алкоголем; средняя порция и сбор (правка владельца 02.10)', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'muhomor')!);
    expect(text).toContain('с алкоголем');
    expect(text).toContain('Средняя порция - 1 г красного мухомора или 0,2 г пантерного в день.');
    expect(text).toContain('Собираем раз в год в нетронутых лесах Алтая');
    expect(text).toContain('ферментируем - от 2 месяцев');
    // «заповедных» не пишем: сбор в заповеднике запрещён (33-ФЗ) — фраза читалась бы как признание
    expect(text).not.toMatch(/заповедн/i);
  });

  it('ежовик: свой, на буром рисе, больше 4 лет на ферме', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'ezhovik')!);
    expect(text).toContain('Поэтому мы выращиваем ежовик сами: на буром рисе, на своей ферме в Севастополе, уже больше 4 лет.');
  });

  it('ежовик: нейрогенез и миелиновая оболочка - с тем, где это видели (правка владельца 02.10)', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'ezhovik')!);
    expect(text).toContain('в опытах на клетках и животных');
    expect(text).toContain('нейрогенез');
    expect(text).toContain('миелиновую оболочку');
    expect(text).toContain('Поэтому его принимают для памяти и внимания.');
  });

  it('кордицепс: без мышьяка; урок 6: мягче про перерыв; урок 7: всё в одном приложении', () => {
    const byId = (id: string) => lessonText(GUIDE_LESSONS.find((l) => l.id === id)!);
    expect(byId('kordiceps')).not.toContain('мышьяк');
    expect(byId('start')).not.toContain('сыпь');
    expect(byId('start')).toContain('Первую неделю может идти адаптация к добавкам. Если состояние нетипичное, стоит сделать перерыв, чтобы исключить другие факторы.');
    expect(byId('choose')).toContain('система оздоровления и поддержания состояния, система бонусов и рекомендаций - все внутри одного приложения');
  });

  it('кордицепс: без экстрактов и «подделок», факт 1993 года, частые эффекты, обе формы', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'kordiceps')!);
    expect(text).not.toMatch(/экстракт/i);
    expect(text).not.toContain('Под видом кордицепса');
    expect(text).toContain('1993');
    expect(text).toContain('золото чемпионата мира');
    for (const effect of ['быстрое восстановление после тренировок', 'меньше воспалений', 'выше либидо']) {
      expect(text).toContain(effect);
    }
    expect(text).toContain('и мицелий, и плодовые тела');
  });

  it('урок 6: с ежовика, комбинация, комплекс; вопрос про максимальный эффект', () => {
    const lesson = GUIDE_LESSONS.find((l) => l.id === 'start')!;
    const text = lessonText(lesson);
    expect(text).toContain('Можно начать с ежовика - он подходит почти всем.');
    expect(text).toContain('ежовик + мухомор');
    expect(text).toContain('Для максимального эффекта берите комплекс.');
    expect(text).toContain('Отмечайте состояние в дневнике или в этом приложении');
    expect(lesson.question.text).toBe('Как получить максимальный эффект?');
    expect(lesson.question.options[lesson.question.correct]).toBe('Брать комплекс');
  });

  it('урок 7: настоящий вид гриба, доставка OZON и СДЭК, отзывы', () => {
    const text = lessonText(GUIDE_LESSONS.find((l) => l.id === 'choose')!);
    expect(text).toContain('Лично я люблю настоящий вид гриба');
    expect(text).toContain('доставляем через OZON и СДЭК');
    expect(text).not.toContain('WB');
    expect(text).toContain('t.me/spor3s_comments');
    expect(text).toContain('кордицепс - и мицелий, и плодовые тела');
  });

  it('«е» вместо «ё» во всех текстах гида (правка владельца 02.10)', () => {
    const all = GUIDE_LESSONS.map((l) => [l.title, lessonText(l), l.question.text, ...l.question.options, l.question.hint, l.note].join(' ')).join(' ');
    expect(all).not.toMatch(/[ёЁ]/);
    expect(all).toContain('Черного моря');
  });

  it('без длинных тире — только «-» (правка владельца 02.10)', () => {
    const all = GUIDE_LESSONS.map((l) => [l.title, lessonText(l), l.question.text, ...l.question.options, l.question.hint, l.note].join(' ')).join(' ');
    expect(all).not.toMatch(/[—–]/);
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
