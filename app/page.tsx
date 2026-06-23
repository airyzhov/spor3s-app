import AppClient from './(client)/AppClient';
import { CartProvider } from './CartContext';

export default function Home() {
  return (
    <CartProvider>
      <AppClient />
    </CartProvider>
  );
}