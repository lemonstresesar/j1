import React, { useState } from 'react';
import { X, Share2, ShoppingBag, Plus, Minus, ArrowLeft, Truck, ShieldCheck } from 'lucide-react';
import { Product } from '../../types';
import { formatFCFA } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addItem, showToast, language } = useCart();
  const t = translations[language];

  const photos = product.photos && product.photos.length > 0
    ? product.photos
    : ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'];

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const currentPrice = hasDiscount ? product.discountPrice! : product.price;
  const originalPrice = hasDiscount ? product.price : undefined;

  const handleShare = async () => {
    const directUrl = `${window.location.origin}/produit/${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | ${t.storeName}`,
          text: `${product.name} - ${formatFCFA(currentPrice)} chez For him and her Douala.`,
          url: directUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share not supported, fallback to clipboard
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
        id: product.id,
        type: 'product',
        name: product.name,
        price: currentPrice,
        originalPrice,
        photo: photos[0],
        category: product.category,
        gender: product.gender,
      },
      quantity
    );
    onClose();
  };

  const categoryLabel = {
    vetements: t.cat_vetements,
    chaussures: t.cat_chaussures,
    parfums: t.cat_parfums,
    sacs: t.cat_sacs,
    accessoires: t.cat_accessoires,
  }[product.category] || product.category;

  const genderLabel = {
    homme: t.men,
    femme: t.women,
    unisexe: t.unisex,
  }[product.gender] || product.gender;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col md:flex-row">
        
        {/* Mobile top close button */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-20 p-2 rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery column */}
        <div className="md:w-1/2 p-4 sm:p-6 bg-slate-50 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Main large image */}
            <div className="relative aspect-4/5 w-full rounded-2xl overflow-hidden bg-slate-200 shadow-inner">
              <img
                src={photos[selectedPhotoIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {hasDiscount && (
                <span className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-lg bg-rose-500 text-white shadow-md">
                  Promotion
                </span>
              )}
            </div>

            {/* Thumbnails if multiple photos */}
            {photos.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedPhotoIndex === idx
                        ? 'border-[#0B2A4A] ring-2 ring-[#0B2A4A]/20 scale-102'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 pt-4 text-xs text-slate-500">
            <Truck className="w-4 h-4 text-[#1E63B5]" />
            <span>{t.deliveryInfo}</span>
          </div>
        </div>

        {/* Product details column */}
        <div className="md:w-1/2 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Top row with tags and actions */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#EAF2FB] text-[#0B2A4A] uppercase tracking-wider">
                  {categoryLabel} • {genderLabel}
                </span>
              </div>

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

            {/* Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 font-serif leading-snug">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0B2A4A] font-serif">
                {formatFCFA(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-base sm:text-lg text-slate-400 line-through">
                  {formatFCFA(originalPrice)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  -{Math.round(((originalPrice! - currentPrice) / originalPrice!) * 100)}%
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mt-6 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Description
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description || 'Article de qualité supérieure sélectionné par For him and her Douala.'}
              </p>
            </div>

            {/* Trust highlights */}
            <div className="mt-6 p-3.5 rounded-2xl bg-[#EAF2FB]/50 border border-[#D3E4F7] space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1E63B5] shrink-0" />
                <span>Paiement par dépôt sécurisé (Orange Money / MTN MoMo).</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#1E63B5] shrink-0" />
                <span>Livraison partout à Douala avec coursier dédié.</span>
              </div>
            </div>
          </div>

          {/* Action footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              {/* Quantity selector */}
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                  aria-label="Moins"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                  aria-label="Plus"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#0B2A4A] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1E63B5] transition-all shadow-md active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t.addToCart} • {formatFCFA(currentPrice * quantity)}</span>
              </button>
            </div>

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
