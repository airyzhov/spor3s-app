import { NextResponse } from 'next/server';

const products = [
  {
    id: 'ezh100',
    name: 'Ежовик 100г порошок',
    price: 1100, // Исправлено с 1200 на 1100
    description: 'Ежовик гребенчатый для памяти, концентрации и нервной системы. Порошок для опытных пользователей.',
    image: '/products/ezh100.jpg'
  },
  {
    id: 'ezh120k',
    name: 'Ежовик 120 капсул',
    price: 1100, // Исправлено с 1500 на 1100  
    description: 'Ежовик гребенчатый в удобных капсулах. Идеально для новичков.',
    image: '/products/ezh120k.jpg'
  },
  {
    id: 'ezh300',
    name: 'Ежовик 300г порошок',
    price: 3000,
    description: 'Ежовик гребенчатый порошок на 3 месяца. Для опытных пользователей.',
    image: '/products/ezh300.jpg'
  },
  {
    id: 'ezh360k',
    name: 'Ежовик 360 капсул',
    price: 3000,
    description: 'Ежовик гребенчатый в капсулах на 3 месяца. Удобно для длительного курса.',
    image: '/products/ezh120k.jpg'
  },
  {
    id: 'ezh500',
    name: 'Ежовик 500г порошок',
    price: 4500,
    description: 'Ежовик гребенчатый порошок максимальная упаковка. Экономично для длительного курса.',
    image: '/products/ezh500.jpg'
  },
  {
    id: 'mhm30',
    name: 'Мухомор 30г',
    price: 1400, // Исправлено с 800 на 1400
    description: 'Мухомор красный для сна и стресса. Стартовая дозировка для новичков.',
    image: '/products/mhm30.jpg'
  },
  {
    id: 'mhm50',
    name: 'Мухомор 50г',
    price: 2200, // Исправлено с 1200 на 2200
    description: 'Мухомор красный, стандартная упаковка на месяц.',
    image: '/products/mhm50.jpg'
  },
  {
    id: 'mhm60k',
    name: 'Мухомор 60 капсул',
    price: 1400,
    description: 'Мухомор красный в капсулах на месяц. Удобно для новичков.',
    image: '/products/mhm60k.jpg'
  },
  {
    id: 'mhm100',
    name: 'Мухомор 100г',
    price: 4000, // Исправлено с 2000 на 4000
    description: 'Мухомор красный, экономичная упаковка для опытных пользователей.',
    image: '/products/mhm100.jpg'
  },
  {
    id: 'mhm180k',
    name: 'Мухомор 180 капсул',
    price: 4000,
    description: 'Мухомор красный в капсулах на 3 месяца. Удобно для длительного курса.',
    image: '/products/mhm60k.JPG'
  },
  {
    id: 'ci30',
    name: 'Цистозира 30г',
    price: 500, // Исправлено с 900 на 500
    description: 'Морская водоросль для щитовидной железы и гормональной системы.',
    image: '/products/ci30.jpg'
  },
  {
    id: 'ci90',
    name: 'Цистозира 90г',
    price: 1350,
    description: 'Морская водоросль для щитовидной железы и гормональной системы. Курс на 3 месяца.',
    image: '/products/ci30.jpg'
  },
  {
    id: 'kor50',
    name: 'Кордицепс 50г',
    price: 800, // Исправлено с 1400 на 800
    description: 'Кордицепс Милитарис плодовые тела для энергии и выносливости.',
    image: '/products/kor50.jpg'
  },
  {
    id: 'kor150',
    name: 'Кордицепс 150г',
    price: 2000,
    description: 'Кордицепс Милитарис плодовые тела на 3 месяца. Для длительного курса.',
    image: '/products/kor50.JPG'
  },
  {
    id: '4v1',
    name: '4 в 1 (месяц)',
    price: 3300,
    description: 'Комплекс: Ежовик + Мухомор + Кордицепс + Цистозира. Курс на месяц.',
    image: '/products/4v1.jpg'
  },
  {
    id: '4v1-3',
    name: '4 в 1 (3 месяца)',
    price: 9000,
    description: 'Комплекс: Ежовик + Мухомор + Кордицепс + Цистозира. Курс на 3 месяца.',
    image: '/products/4v1-3.jpg'
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 