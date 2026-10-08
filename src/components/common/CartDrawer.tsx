import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatFCFA } from '../../utils/formatters';
import { translations } from '../../i18n/translations';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    setIsCheckoutOpen,
    language,
  } = useCart();

  const t = translations[language];

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#EAF2FB]/50">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#0B2A4A]" />
              <h2 className="text-lg font-bold text-[#0B2A4A] font-serif">{t.cartTitle}</h2>
              {items.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0B2A4A] text-white">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-[#EAF2FB] flex items-center justify-center text-[#1E63B5] mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#0B2A4A] mb-1">{t.emptyCartTitle}</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-6">{t.emptyCartMessage}</p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#0B2A4A] text-white text-xs font-semibold hover:bg-[#1E63B5] transition-colors shadow-xs"
                >
                  {t.startShopping}
                </button>
              </div>
            ) : (
              items.map((item) => {
                const itemId = item.cartItemId || item.id;
                return (
                  <div
                    key={itemId}
                    className="flex gap-3.5 p-3 rounded-2xl border border-slate-100 bg-white hover:border-[#D3E4F7] transition-all shadow-xs"
                  >
                    {/* Photo */}
                    <img
                      src={item.photo}
                      alt={item.name}
                      className="w-20 h-20 sm:w-22 sm:h-22 object-cover rounded-xl bg-slate-100 shrink-0"
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(itemId)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Variants & Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {item.type === 'pack' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#EAF2FB] text-[#1E63B5]">
                              Pack
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                              Couleur : {item.selectedColor}
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                              Taille : {item.selectedSize}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                        <div className="text-xs sm:text-sm font-bold text-[#0B2A4A] font-serif">
                          {formatFCFA(item.price * item.quantity)}
                        </div>

                        {/* Quantity counter */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemId, -1)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-l-md transition-colors cursor-pointer"
                            aria-label="Diminuer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemId, 1)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-r-md transition-colors cursor-pointer"
                            aria-label="Augmenter"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#EAF2FB]/30 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">{t.subtotal}</span>
                <span className="text-lg font-bold text-[#0B2A4A] font-serif">
                  {formatFCFA(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {language === 'fr'
                  ? 'Frais de livraison calculés à l’étape suivante selon le quartier à Douala.'
                  : 'Delivery fee calculated at next step based on Douala neighborhood.'}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={clearCart}
                  className="px-3 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                  title={t.clearCart}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#0B2A4A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1E63B5] transition-colors shadow-md active:scale-[0.98]"
                >
                  <span>{t.checkout}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
