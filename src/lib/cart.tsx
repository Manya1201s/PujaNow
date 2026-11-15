import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SamagriProduct } from '@/types';

export interface CartItem {
  product: SamagriProduct;
  quantity: number;
}

type CartContextType = {
  items: CartItem[];
  addItem: (product: SamagriProduct, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'pujanow_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CartItem[];
  } catch {
    // ignore
  }
  return [];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  const persist = (newItems: CartItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch {
      // ignore
    }
  };

  const addItem = useCallback((product: SamagriProduct, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      let next: CartItem[];
      const cap = (n: number) => (product.stock > 0 ? Math.min(n, product.stock) : n);
      if (existing) {
        next = prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: cap(i.quantity + qty) } : i,
        );
      } else {
        next = [...prev, { product, quantity: cap(qty) }];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => {
        const next = prev.filter((i) => i.product.id !== productId);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: i.product.stock > 0 ? Math.min(qty, i.product.stock) : qty }
          : i,
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => persist([]), []);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
