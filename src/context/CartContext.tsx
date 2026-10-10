import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Language } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  addMultipleItems: (itemsList: Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>) => void;
  buyNow: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  buyNowMultiple: (itemsList: Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>) => void;
  directCheckoutItem: CartItem | null;
  setDirectCheckoutItem: (item: CartItem | null) => void;
  directCheckoutItems: CartItem[] | null;
  setDirectCheckoutItems: (items: CartItem[] | null) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CART_STORAGE_KEY = 'fhh_cart_items_v1';
const LANG_STORAGE_KEY = 'fhh_user_lang_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'en' ? 'en' : 'fr';
    } catch {
      return 'fr';
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [directCheckoutItem, setDirectCheckoutItemState] = useState<CartItem | null>(null);
  const [directCheckoutItems, setDirectCheckoutItems] = useState<CartItem[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const setDirectCheckoutItem = (item: CartItem | null) => {
    setDirectCheckoutItemState(item);
    if (!item) {
      setDirectCheckoutItems(null);
    } else {
      setDirectCheckoutItems([item]);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save cart to localStorage:', e);
    }
  }, [items]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const colorKey = item.selectedColor ? item.selectedColor.trim() : '';
    const sizeKey = item.selectedSize ? item.selectedSize.trim() : '';
    const compositeId = `${item.id}::${colorKey}::${sizeKey}`;

    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          (i.cartItemId || i.id) === compositeId ||
          (i.id === item.id && (i.selectedColor || '') === colorKey && (i.selectedSize || '') === sizeKey)
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, cartItemId: compositeId, quantity }];
    });
    showToast(language === 'fr' ? 'Article ajouté au panier !' : 'Item added to cart!');
  };

  const addMultipleItems = (itemsList: Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>) => {
    if (!itemsList || itemsList.length === 0) return;
    setItems((prev) => {
      let currentItems = [...prev];
      itemsList.forEach(({ item, quantity }) => {
        const colorKey = item.selectedColor ? item.selectedColor.trim() : '';
        const sizeKey = item.selectedSize ? item.selectedSize.trim() : '';
        const compositeId = `${item.id}::${colorKey}::${sizeKey}`;

        const existingIndex = currentItems.findIndex(
          (i) =>
            (i.cartItemId || i.id) === compositeId ||
            (i.id === item.id && (i.selectedColor || '') === colorKey && (i.selectedSize || '') === sizeKey)
        );

        if (existingIndex >= 0) {
          currentItems[existingIndex] = {
            ...currentItems[existingIndex],
            quantity: currentItems[existingIndex].quantity + quantity,
          };
        } else {
          currentItems.push({
            ...item,
            cartItemId: compositeId,
            quantity,
          });
        }
      });
      return currentItems;
    });

    const totalQty = itemsList.reduce((acc, curr) => acc + curr.quantity, 0);
    showToast(language === 'fr' ? `${totalQty} article(s) ajoutés au panier !` : `${totalQty} item(s) added to cart!`);
  };

  const buyNow = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const colorKey = item.selectedColor ? item.selectedColor.trim() : '';
    const sizeKey = item.selectedSize ? item.selectedSize.trim() : '';
    const compositeId = `${item.id}::${colorKey}::${sizeKey}`;

    const directItem: CartItem = {
      ...item,
      cartItemId: compositeId,
      quantity,
    };

    setDirectCheckoutItemState(directItem);
    setDirectCheckoutItems([directItem]);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const buyNowMultiple = (itemsList: Array<{ item: Omit<CartItem, 'quantity'>; quantity: number }>) => {
    if (!itemsList || itemsList.length === 0) return;
    const directList: CartItem[] = itemsList.map(({ item, quantity }) => {
      const colorKey = item.selectedColor ? item.selectedColor.trim() : '';
      const sizeKey = item.selectedSize ? item.selectedSize.trim() : '';
      const compositeId = `${item.id}::${colorKey}::${sizeKey}::${Date.now()}::${Math.random().toString(36).substring(2, 6)}`;
      return {
        ...item,
        cartItemId: compositeId,
        quantity,
      };
    });

    setDirectCheckoutItemState(directList[0]);
    setDirectCheckoutItems(directList);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => (i.cartItemId || i.id) !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) => {
      return prev
        .map((i) => {
          if ((i.cartItemId || i.id) === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null);
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addMultipleItems,
        buyNow,
        buyNowMultiple,
        directCheckoutItem,
        setDirectCheckoutItem,
        directCheckoutItems,
        setDirectCheckoutItems,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        language,
        setLanguage,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B2A4A] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium animate-bounce border border-white/20">
          <span>{toastMessage}</span>
        </div>
      )}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
