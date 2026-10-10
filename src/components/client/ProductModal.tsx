import React, { useState } from 'react';
import {
  X,
  Share2,
  ShoppingBag,
  Plus,
  Minus,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Check,
  Sparkles,
  Palette,
  Ruler,
  Send,
  Camera,
} from 'lucide-react';
import { Product } from '../../types';
import { formatFCFA } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addItem, buyNow, showToast, setIsCartOpen, language } = useCart();
  const t = translations[language];

  const photos =
    product.photos && product.photos.length > 0
      ? product.photos
      : ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'];

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // 1. Quantity choice
  const [quantity, setQuantity] = useState(1);

  // 2. Color choices: STRICTLY defined by the seller.
  // If the seller enabled multiple colors AND added specific colors:
  const hasMultipleColors = Boolean(
    product.hasMultipleColors && product.availableColors && product.availableColors.length > 0
  );
  const availableColorsList = hasMultipleColors ? product.availableColors! : [];
  const [selectedColor, setSelectedColor] = useState<string>(
    hasMultipleColors && availableColorsList.length > 0 ? availableColorsList[0] : 'Conforme à la photo'
  );

  // 3. Size / Pointure choices: STRICTLY defined by the seller.
  // If the seller enabled multiple sizes AND added specific sizes:
  const hasMultipleSizes = Boolean(
    product.hasMultipleSizes && product.availableSizes && product.availableSizes.length > 0
  );
  const availableSizesList = hasMultipleSizes ? product.availableSizes! : [];
  const [selectedSize, setSelectedSize] = useState<string>(
    hasMultipleSizes && availableSizesList.length > 0 ? availableSizesList[0] : 'Taille unique'
  );

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

  const finalColorChoice = hasMultipleColors ? selectedColor : 'Conforme à la photo';
  const finalSizeChoice = hasMultipleSizes ? selectedSize : undefined;

  // Direct checkout action (Order immediately without visiting cart)
  const handleDirectOrder = () => {
    buyNow(
      {
        id: product.id,
        type: 'product',
        name: product.name,
        price: currentPrice,
        originalPrice,
        photo: photos[0],
        category: product.category,
        gender: product.gender,
        selectedColor: finalColorChoice,
        selectedSize: finalSizeChoice,
      },
      quantity
    );
    onClose();
  };

  // Add to cart action (Allows adding more items)
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
        selectedColor: finalColorChoice,
        selectedSize: finalSizeChoice,
      },
      quantity
    );
    onClose();
    setIsCartOpen(true);
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

  const sizeTypeLabel =
    product.category === 'chaussures'
      ? 'Pointure'
      : product.category === 'vetements'
      ? 'Taille'
      : product.category === 'parfums'
      ? 'Volume'
      : 'Dimension';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col md:flex-row">
        {/* Mobile top close button */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-20 p-2 rounded-full bg-white/95 text-slate-700 shadow-md hover:bg-white cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery column */}
        <div className="md:w-1/2 p-4 sm:p-6 bg-slate-50 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Main large image */}
            <div className="relative aspect-[4/3] sm:aspect-4/5 w-full rounded-2xl overflow-hidden bg-slate-200 shadow-inner">
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
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
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

        {/* Product details and options column */}
        <div className="md:w-1/2 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Top row with tags and actions */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#EAF2FB] text-[#0B2A4A] uppercase tracking-wider">
                  {categoryLabel} • {genderLabel}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 text-slate-500 hover:text-[#0B2A4A] hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title={t.share}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.share}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="hidden md:flex p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif leading-snug">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0B2A4A] font-serif">
                {formatFCFA(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-base text-slate-400 line-through">
                  {formatFCFA(originalPrice)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  -{Math.round(((originalPrice! - currentPrice) / originalPrice!) * 100)}%
                </span>
              )}
            </div>

            {/* SECTION 1: Choix de la Quantité */}
            <div className="mt-5 pt-4 border-t border-slate-100 bg-[#EAF2FB]/40 -mx-5 sm:-mx-7 px-5 sm:px-7 py-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B2A4A] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center text-[10px] font-extrabold">
                    1
                  </span>
                  <span>Quantité à commander :</span>
                </span>
                <span className="text-xs font-extrabold text-[#1E63B5]">
                  {formatFCFA(currentPrice * quantity)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
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
                  <span className="w-9 text-center text-sm font-extrabold text-[#0B2A4A]">
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
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        quantity === num
                          ? 'bg-[#0B2A4A] text-white shadow-xs scale-102 ring-2 ring-[#0B2A4A]/20'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num} {num === 1 ? 'article' : 'articles'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 2: Choix de la Couleur (Strictement défini par le vendeur) */}
            {hasMultipleColors ? (
              <div className="mt-4 pt-3 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center text-[10px] font-extrabold">
                      2
                    </span>
                    <Palette className="w-3.5 h-3.5 text-[#1E63B5]" />
                    <span>Couleur disponible chez le vendeur :</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#1E63B5]">
                    {selectedColor}
                  </span>
                </label>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableColorsList.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B2A4A] text-white font-bold shadow-xs scale-102 ring-2 ring-[#0B2A4A]/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">
                    2
                  </span>
                  <Palette className="w-3.5 h-3.5 text-[#1E63B5]" />
                  <span>Couleur du produit :</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2 text-xs text-slate-700">
                  <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold">Couleur unique • Conforme à la photo de l'article</span>
                </div>
              </div>
            )}

            {/* SECTION 3: Choix de la Taille / Pointure (Strictement défini par le vendeur) */}
            {hasMultipleSizes ? (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center text-[10px] font-extrabold">
                      3
                    </span>
                    <Ruler className="w-3.5 h-3.5 text-[#1E63B5]" />
                    <span>Choisir votre {sizeTypeLabel} :</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#1E63B5]">{selectedSize}</span>
                </label>

                <div className="flex flex-wrap gap-2 pt-1">
                  {availableSizesList.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B2A4A] text-white shadow-xs scale-102 ring-2 ring-[#0B2A4A]/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">
                    3
                  </span>
                  <Ruler className="w-3.5 h-3.5 text-[#1E63B5]" />
                  <span>{sizeTypeLabel} :</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Taille / Pointure unique standard</span>
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Description
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* Action footer: Direct Order (without visiting cart) OR Add to cart */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
            {/* Direct immediate order button (No cart needed) */}
            <button
              type="button"
              onClick={handleDirectOrder}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-sm sm:text-base flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-[#0B2A4A]/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Valider et commander cet article • {formatFCFA(currentPrice * quantity)}</span>
              </div>
              <span className="text-[11px] font-normal text-slate-200">
                Commande directe sans passer par le panier
              </span>
            </button>

            {/* Add to cart button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="w-full py-2.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200/80 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#0B2A4A]" />
              <span>Ajouter au panier (continuer mes achats)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-1 text-center text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
