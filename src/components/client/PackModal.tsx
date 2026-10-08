import React, { useState } from 'react';
import { X, Share2, ShoppingBag, Plus, Minus, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Pack } from '../../types';
import { formatFCFA, formatDoualaDateOnly } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface PackModalProps {
  pack: Pack;
  onClose: () => void;
}

export const PackModal: React.FC<PackModalProps> = ({ pack, onClose }) => {
  const { addItem, showToast, setIsCartOpen, language } = useCart();
  const t = translations[language];

  const [quantity, setQuantity] = useState(1);

  const hasDiscount = pack.discountPrice && pack.discountPrice < pack.price;
  const currentPrice = hasDiscount ? pack.discountPrice! : pack.price;
  const originalPrice = hasDiscount ? pack.price : undefined;

  const handleShare = async () => {
    const directUrl = `${window.location.origin}/pack/${pack.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${pack.name} | ${t.storeName}`,
          text: `${pack.name} - ${formatFCFA(currentPrice)} chez For him and her Douala.`,
          url: directUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(directUrl);
      showToast(t.linkCopied);
    } catch {
      showToast(directUrl);
    }
  };

  const handleAddToCart = () => {
    addItem(
      {
        id: pack.id,
        type: 'pack',
        name: pack.name,
        price: currentPrice,
        originalPrice,
        photo: pack.photo,
      },
      quantity
    );
    onClose();
    setIsCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col md:flex-row">
        
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-20 p-2 rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image column */}
        <div className="md:w-1/2 p-4 sm:p-6 bg-slate-50 flex flex-col justify-between">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-200 shadow-inner">
            <img
              src={pack.photo}
              alt={pack.name}
              className="w-full h-full object-cover"
            />
            {pack.isGombo && (
              <span className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-lg bg-[#1E63B5] text-white shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {t.gomboTitle}
              </span>
            )}
          </div>

          {pack.gomboEndDate && (
            <p className="mt-4 text-center text-xs font-medium text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              ⚡ Valable jusqu’au {formatDoualaDateOnly(pack.gomboEndDate)}
            </p>
          )}
        </div>

        {/* Content column */}
        <div className="md:w-1/2 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#EAF2FB] text-[#0B2A4A] uppercase tracking-wider">
                Pack Collection
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 text-slate-500 hover:text-[#0B2A4A] hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title={t.share}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.share}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="hidden md:flex p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif leading-snug">
              {pack.name}
            </h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0B2A4A] font-serif">
                {formatFCFA(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-base text-slate-400 line-through">
                  {formatFCFA(originalPrice)}
                </span>
              )}
            </div>

            <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {pack.description}
            </p>

            {/* Included items */}
            {pack.items && pack.items.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t.packContents}
                </h4>
                <div className="space-y-1.5">
                  {pack.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-xs font-medium text-slate-800 border border-slate-100"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#1E63B5] shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 space-y-3">
            {/* Quantity selection heading and quick chips */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Quantité de packs :</span>
                <span className="font-semibold text-[#0B2A4A]">
                  Sous-total : {formatFCFA(currentPrice * quantity)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                {/* Stepper */}
                <div className="flex items-center border border-slate-200 rounded-xl bg-white p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                    aria-label="Moins"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-extrabold text-[#0B2A4A]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                    aria-label="Plus"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick quantity chips */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        quantity === num
                          ? 'bg-[#0B2A4A] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Validate and add button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0B2A4A] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1E63B5] transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Valider et ajouter au panier • {formatFCFA(currentPrice * quantity)}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backToCatalog}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
