/**
 * @jest-environment jsdom
 */
import { LOADING_FAILSAFE_SCRIPT, LOADING_FAILSAFE_MS } from '../loadingFailsafe';

// Страховка для случая, когда HTML доехал, а JS-чанки — нет: приложение остаётся на SSR-экране
// «⏳ Загрузка...» навсегда, без сообщения, кнопки и следа в логах. Скрипт инлайновый и от чанков
// не зависит. По истечении срока он показывает сообщение с кнопкой «Обновить», просит Telegram
// убрать заглушку (WebApp.ready) и шлёт маячок в /api/nohydrate — nginx его залогирует с UA.

const LOADING_HTML = '<div id="app-loading"><div>⏳</div><div>Загрузка...</div></div>';

function runScript() {
  // eslint-disable-next-line no-new-func
  new Function(LOADING_FAILSAFE_SCRIPT)();
}

describe('loading failsafe', () => {
  let fetchMock: jest.Mock;
  let readyMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = LOADING_HTML;
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;
    readyMock = jest.fn();
    (window as any).Telegram = { WebApp: { ready: readyMock } };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).Telegram;
  });

  it('ничего не делает, если приложение смонтировалось до срока', () => {
    runScript();
    // React смонтировался — экран загрузки исчез из DOM
    document.body.innerHTML = '<nav>Каталог</nav>';
    jest.advanceTimersByTime(LOADING_FAILSAFE_MS + 1000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.body.innerHTML).toBe('<nav>Каталог</nav>');
  });

  it('по истечении срока показывает сообщение и кнопку «Обновить»', () => {
    runScript();
    jest.advanceTimersByTime(LOADING_FAILSAFE_MS);
    const box = document.getElementById('app-loading')!;
    expect(box.textContent).toMatch(/Не удалось загрузить/);
    const btn = box.querySelector('button')!;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toMatch(/Обновить/);
  });

  it('просит Telegram убрать заглушку, чтобы сообщение было видно', () => {
    runScript();
    jest.advanceTimersByTime(LOADING_FAILSAFE_MS);
    expect(readyMock).toHaveBeenCalled();
  });

  it('шлёт маячок с временем ожидания и состоянием документа', () => {
    runScript();
    jest.advanceTimersByTime(LOADING_FAILSAFE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/^\/api\/nohydrate\?/);
    expect(url).toMatch(/[?&]t=\d+/);
    expect(url).toMatch(/[?&]rs=(loading|interactive|complete)/);
    expect(url).toMatch(/[?&]tg=1/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', keepalive: true });
  });

  it('по DOMContentLoaded сразу просит Telegram показать страницу, не дожидаясь React', () => {
    runScript();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(readyMock).toHaveBeenCalledTimes(1);
    // а сообщение об ошибке при этом не показывает — срок ещё не вышел
    expect(document.getElementById('app-loading')!.textContent).toMatch(/Загрузка/);
  });

  it('не падает, если SDK Телеграма не загрузился', () => {
    // именно undefined: delete в jsdom свойство с window не снимает
    (window as any).Telegram = undefined;
    runScript();
    expect(() => jest.advanceTimersByTime(LOADING_FAILSAFE_MS)).not.toThrow();
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/[?&]tg=0/);
  });
});
