import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface CartItem {
  lineId: string;
  articleId: string;
  nom: string;
  prix: number;
  photoUrl?: string;
  quantite: number;
  instructions?: string;
  variantLabel?: string;
  variantSupplement?: number;
  categorie?: { nom: string; icone?: string };
}

interface SavedCart {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  updatedAt: number;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  addItem: (
    item: Omit<CartItem, 'lineId' | 'quantite'> & {
      restaurantId: string;
      restaurantName: string;
    },
    quantite?: number,
  ) => void;
  updateQuantity: (lineId: string, quantite: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  total: () => number;
  isEmpty: () => boolean;
  isRestaurantCart: (restaurantId: string) => boolean;
  checkExpiration: () => boolean;
}

const CART_TTL_MS = 30 * 60 * 1000;
// Strict UUID v4: version bit (4) and variant bits (8/9/a/b) must be correct.
// This rejects legacy placeholder IDs like 11111111-1111-1111-1111-111111111111
// so stale carts are automatically cleared after DB migration.
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUUID = (v: unknown): string | null =>
  typeof v === 'string' && UUID_V4_RE.test(v) ? v : null;

function getCartKey(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.id) return `cart:${user.id}`;
  } catch { /* ignore */ }
  return 'cart';
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function createLineId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSavedItems(rawItems: unknown): CartItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const current = item as Partial<CartItem>;
      if (!current.articleId || !current.nom) {
        return null;
      }

      return {
        lineId: current.lineId || `${current.articleId}-${index}`,
        articleId: current.articleId,
        nom: current.nom,
        prix: Number(current.prix || 0),
        photoUrl: current.photoUrl,
        quantite: Math.max(1, Number(current.quantite || 1)),
        instructions: current.instructions,
        variantLabel: current.variantLabel,
        variantSupplement: current.variantSupplement != null ? Number(current.variantSupplement) : undefined,
        categorie: current.categorie,
      };
    })
    .filter(Boolean) as CartItem[];
}

function readSavedCart(): SavedCart | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const key = getCartKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const saved = JSON.parse(raw) as SavedCart;
    if (Date.now() - saved.updatedAt > CART_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    const validId = validUUID(saved.restaurantId);
    return {
      items: normalizeSavedItems(saved.items),
      restaurantId: validId,
      restaurantName: validId ? (saved.restaurantName || null) : null,
      updatedAt: saved.updatedAt,
    };
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const savedCart = readSavedCart();

  const [items, setItems] = useState<CartItem[]>(savedCart?.items || []);
  const [restaurantId, setRestaurantId] = useState<string | null>(
    savedCart?.restaurantId || null,
  );
  const [restaurantName, setRestaurantName] = useState<string | null>(
    savedCart?.restaurantName || null,
  );

  useEffect(() => {
    const payload: SavedCart = {
      items,
      restaurantId,
      restaurantName,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getCartKey(), JSON.stringify(payload));
  }, [items, restaurantId, restaurantName]);

  const addItem = (
    item: Omit<CartItem, 'lineId' | 'quantite'> & {
      restaurantId: string;
      restaurantName: string;
    },
    quantite = 1,
  ) => {
    if (restaurantId && restaurantId !== item.restaurantId) {
      if (
        confirm(
          `Votre panier contient des articles de ${restaurantName}. Voulez-vous vider le panier pour ajouter des articles de ${item.restaurantName} ?`,
        )
      ) {
        setItems([
          {
            ...item,
            lineId: createLineId(),
            quantite: Math.max(1, quantite),
          },
        ]);
        setRestaurantId(item.restaurantId);
        setRestaurantName(item.restaurantName);
      }
      return;
    }

    if (!restaurantId) {
      setRestaurantId(item.restaurantId);
      setRestaurantName(item.restaurantName);
    }

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.articleId === item.articleId && (i.variantLabel || '') === ((item as CartItem).variantLabel || ''),
      );
      if (existing) {
        return prev.map((i) =>
          i.lineId === existing.lineId
            ? { ...i, quantite: i.quantite + Math.max(1, quantite) }
            : i,
        );
      }
      return [
        ...prev,
        {
          ...item,
          lineId: createLineId(),
          quantite: Math.max(1, quantite),
        },
      ];
    });
  };

  const updateQuantity = (lineId: string, quantite: number) => {
    if (quantite <= 0) {
      setItems((prev) => {
        const nextItems = prev.filter((item) => item.lineId !== lineId);
        if (nextItems.length === 0) {
          setRestaurantId(null);
          setRestaurantName(null);
        }
        return nextItems;
      });
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.lineId === lineId ? { ...item, quantite: Math.max(1, quantite) } : item,
      ),
    );
  };

  const removeItem = (lineId: string) => {
    setItems((prev) => {
      const nextItems = prev.filter((item) => item.lineId !== lineId);
      if (nextItems.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return nextItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
  };

  const checkExpiration = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const key = getCartKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        return false;
      }

      const saved = JSON.parse(raw) as SavedCart;
      const expired = Date.now() - saved.updatedAt > CART_TTL_MS;
      if (expired) {
        setItems([]);
        setRestaurantId(null);
        setRestaurantName(null);
        localStorage.removeItem(key);
      }
      return expired;
    } catch {
      return false;
    }
  };

  const total = () =>
    items.reduce((sum, item) => sum + Number(item.prix) * Number(item.quantite), 0);

  const isEmpty = () => items.length === 0;
  const isRestaurantCart = (currentRestaurantId: string) =>
    restaurantId === currentRestaurantId;

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantName,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        total,
        isEmpty,
        isRestaurantCart,
        checkExpiration,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
