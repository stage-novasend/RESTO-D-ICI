import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // Fonctionnalités de base (ajout, vide...)
  const addToCart = (item) => setCart(prev => [...prev, item]);
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);