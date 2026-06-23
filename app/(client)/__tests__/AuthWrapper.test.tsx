import { render, screen, fireEvent } from '@testing-library/react';
import AppClient from '../AppClient';

describe('Telegram Auth', () => {
  it('отображает кнопку входа и форму Telegram', () => {
    render(<AppClient />);
    // Кнопка входа
    const loginBtn = screen.getByText(/личный кабинет/i);
    expect(loginBtn).toBeInTheDocument();
    fireEvent.click(loginBtn);
    // Кнопка Telegram
    expect(screen.getByText(/вход через telegram/i)).toBeInTheDocument();
  });
}); 