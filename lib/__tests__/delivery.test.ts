import { withDeliveryType } from '../delivery';

describe('withDeliveryType — способ доставки в адресе заказа', () => {
  it('добавляет способ доставки перед адресом', () => {
    expect(withDeliveryType('cdek', 'Симферополь, Киевская 1')).toBe('СДЭК (пункт выдачи): Симферополь, Киевская 1');
    expect(withDeliveryType('ozon', 'Севастополь, ПВЗ 5')).toBe('OZON (пункт выдачи): Севастополь, ПВЗ 5');
    expect(withDeliveryType('courier', 'Ялта, Морская 2')).toBe('СДЭК (курьер): Ялта, Морская 2');
  });

  it('без адреса оставляет только способ доставки', () => {
    expect(withDeliveryType('ozon', '  ')).toBe('OZON (пункт выдачи)');
  });

  it('неизвестный или пустой способ - адрес как есть', () => {
    expect(withDeliveryType(undefined, 'Москва')).toBe('Москва');
    expect(withDeliveryType('post', 'Москва')).toBe('Москва');
  });

  it('не дублирует способ, если он уже в адресе', () => {
    expect(withDeliveryType('cdek', 'СДЭК (пункт выдачи): Москва')).toBe('СДЭК (пункт выдачи): Москва');
  });
});
