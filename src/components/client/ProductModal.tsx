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
  Trash2,
  PlusCircle,
  Layers,
} from 'lucide-react';
import { Product } from '../../types';
import { formatFCFA } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

interface VariantSelection {
  id: string;
  quantity: number;
  color: string;
  size?: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addItem, addMultipleItems, buyNow, buyNowMultiple, showToast, setIsCartOpen, language } = useCart();
  const t = translations[language];

  const photos =
    product.photos && product.photos.length > 0
      ? product.photos
      : ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'];

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Color choices: STRICTLY defined by the seller.
  const hasMultipleColors = Boolean(
    product.hasMultipleColors && product.availableColors && product.availableColors.length > 0
  );
  const availableColorsList = hasMultipleColors ? product.availableColors! : [];

  // Size / Pointure choices: STRICTLY defined by the seller.
  const hasMultipleSizes = Boolean(
    product.hasMultipleSizes && product.availableSizes && product.availableSizes.length > 0
  );
  const availableSizesList = hasMultipleSizes ? product.availableSizes! : [];

  const hasAnyVariants = hasMultipleColors || hasMultipleSizes;

  // Multi-variant combinations state: allows ordering e.g. 1x Blue XL + 3x Grey 2XL on the SAME page
  const [selections, setSelections] = useState<VariantSelection[]>([
    {
      id: 'sel-1',
      quantity: 1,
      color: hasMultipleColors && availableColorsList.length > 0 ? availableColorsList[0] : 'Conforme à la photo',
      size: hasMultipleSizes && availableSizesList.length > 0 ? availableSizesList[0] : undefined,
    },
  ]);

  const updateSelection = (id: string, updates: Partial<VariantSelection>) => {
    setSelections((prev) =>
      prev.map((sel) => (sel.id === id ? { ...sel, ...updates } : sel))
    );
  };

  const addSelection = () => {
    const nextId = `sel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    // Pick next available color or size if possible for user convenience
    const currentColors = selections.map((s) => s.color);
    const nextColor =
      availableColorsList.find((c) => !currentColors.includes(c)) ||
      availableColorsList[0] ||
      'Conforme à la photo';

    const currentSizes = selections.map((s) => s.size);
    const nextSize =
      availableSizesList.find((s) => !currentSizes.includes(s)) ||
      availableSizesList[0] ||
      undefined;

    setSelections((prev) => [
      ...prev,
      {
        id: nextId,
        quantity: 1,
        color: hasMultipleColors ? nextColor : 'Conforme à la photo',
        size: hasMultipleSizes ? nextSize : undefined,
      },
    ]);
  };

  const removeSelection = (id: string) => {
    if (selections.length <= 1) return;
    setSelections((prev) => prev.filter((s) => s.id !== id));
  };

  const totalQuantity = selections.reduce((sum, s) => sum + s.quantity, 0);

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const currentPrice = hasDiscount ? product.discountPrice! : product.price;
  const originalPrice = hasDiscount ? product.price : undefined;
  const totalAmount = currentPrice * totalQuantity;

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

  // Direct checkout action (Order immediately without visiting cart)
  const handleDirectOrder = () => {
    const itemsList = selections.map((sel) => ({
      item: {
        id: product.id,
        type: 'product' as const,
        name: product.name,
        price: currentPrice,
        originalPrice,
        photo: photos[0],
        category: product.category,
        gender: product.gender,
        selectedColor: hasMultipleColors ? sel.color : 'Conforme à la photo',
        selectedSize: hasMultipleSizes ? sel.size : undefined,
      },
      quantity: sel.quantity,
    }));

    if (itemsList.length === 1) {
      buyNow(itemsList[0].item, itemsList[0].quantity);
    } else {
      buyNowMultiple(itemsList);
    }
    onClose();
  };

  // Add to cart action (Allows adding all configured variants to cart at once)
  const handleAddToCart = () => {
    const itemsList = selections.map((sel) => ({
      item: {
        id: product.id,
        type: 'product' as const,
        name: product.name,
        price: currentPrice,
        originalPrice,
        photo: photos[0],
        category: product.category,
        gender: product.gender,
        selectedColor: hasMultipleColors ? sel.color : 'Conforme à la photo',
        selectedSize: hasMultipleSizes ? sel.size : undefined,
      },
      quantity: sel.quantity,
    }));

    if (itemsList.length === 1) {
      addItem(itemsList[0].item, itemsList[0].quantity);
    } else {
      addMultipleItems(itemsList);
    }
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

            {/* VARIATIONS & QUANTITY CONFIGURATION */}
            {!hasAnyVariants ? (
              /* Single variant product (simple quantity selection) */
              <div className="mt-5 pt-4 border-t border-slate-100 bg-[#EAF2FB]/40 -mx-5 sm:-mx-7 px-5 sm:px-7 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B2A4A] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center text-[10px] font-extrabold">
                      1
                    </span>
                    <span>Quantité à commander :</span>
                  </span>
                  <span className="text-xs font-extrabold text-[#1E63B5]">
                    {formatFCFA(totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  {/* Stepper */}
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => updateSelection(selections[0].id, { quantity: Math.max(1, selections[0].quantity - 1) })}
                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                      aria-label="Moins"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-9 text-center text-sm font-extrabold text-[#0B2A4A]">
                      {selections[0].quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateSelection(selections[0].id, { quantity: selections[0].quantity + 1 })}
                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                      aria-label="Plus"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick chips */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updateSelection(selections[0].id, { quantity: num })}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selections[0].quantity === num
                            ? 'bg-[#0B2A4A] text-white shadow-xs scale-102 ring-2 ring-[#0B2A4A]/20'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {num} {num === 1 ? 'article' : 'articles'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    Couleur conforme à la photo
                  </span>
                  <span>•</span>
                  <span>Taille unique standard</span>
                </div>
              </div>
            ) : (
              /* Multi-variant product (allows configuring multiple combinations: e.g. 1x Blue XL + 3x Grey 2XL) */
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center text-[10px] font-extrabold">
                      ✓
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Choix des combinaisons (couleur, taille, quantité) :
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#1E63B5] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    {totalQuantity} article{totalQuantity > 1 ? 's' : ''} au total
                  </span>
                </div>

                {/* List of configured variant combinations */}
                <div className="space-y-3">
                  {selections.map((sel, idx) => (
                    <div
                      key={sel.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 shadow-xs relative transition-all"
                    >
                      {/* Top bar of combination card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#0B2A4A] text-white text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Combinaison {idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#0B2A4A]">
                            {sel.quantity} × {formatFCFA(currentPrice)} = {formatFCFA(currentPrice * sel.quantity)}
                          </span>
                          {selections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSelection(sel.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                              title="Supprimer cette combinaison"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1. Quantity for this combination */}
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/50">
                        <span className="text-xs font-semibold text-slate-600">Quantité pour ce choix :</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5 shadow-xs">
                            <button
                              type="button"
                              onClick={() => updateSelection(sel.id, { quantity: Math.max(1, sel.quantity - 1) })}
                              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                              aria-label="Moins"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center text-xs font-extrabold text-[#0B2A4A]">
                              {sel.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateSelection(sel.id, { quantity: sel.quantity + 1 })}
                              className="p-1 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                              aria-label="Plus"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="hidden sm:flex items-center gap-1">
                            {[1, 2, 3, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => updateSelection(sel.id, { quantity: num })}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  sel.quantity === num
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

                      {/* 2. Color selection for this combination */}
                      {hasMultipleColors && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Palette className="w-3 h-3 text-[#1E63B5]" />
                              Couleur :
                            </span>
                            <span className="font-bold text-[#1E63B5]">{sel.color}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {availableColorsList.map((col) => {
                              const isSelected = sel.color === col;
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => updateSelection(sel.id, { color: col })}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#0B2A4A] text-white font-bold shadow-xs scale-102 ring-2 ring-[#0B2A4A]/20'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {col}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. Size selection for this combination */}
                      {hasMultipleSizes && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Ruler className="w-3 h-3 text-[#1E63B5]" />
                              {sizeTypeLabel} :
                            </span>
                            <span className="font-bold text-[#1E63B5]">{sel.size}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {availableSizesList.map((sz) => {
                              const isSelected = sel.size === sz;
                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => updateSelection(sel.id, { size: sz })}
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#0B2A4A] text-white shadow-xs scale-102 ring-2 ring-[#0B2A4A]/20'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {sz}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add another combination button */}
                <button
                  type="button"
                  onClick={addSelection}
                  className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-[#1E63B5]/40 hover:border-[#1E63B5] bg-blue-50/40 hover:bg-blue-50 text-[#1E63B5] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Ajouter une autre combinaison (autre couleur, autre taille)</span>
                </button>
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
            {/* Visual recap if multiple combinations */}
            {selections.length > 1 && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-[#0B2A4A] flex items-center justify-between">
                  <span>📋 Récapitulatif de votre commande :</span>
                  <span>{formatFCFA(totalAmount)}</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  {selections.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span>
                        • Choix #{i + 1} : {s.quantity} pièce{s.quantity > 1 ? 's' : ''}
                        {hasMultipleColors ? ` (${s.color})` : ''}
                        {hasMultipleSizes ? ` [${s.size}]` : ''}
                      </span>
                      <span className="font-semibold text-slate-800">{formatFCFA(currentPrice * s.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct immediate order button (No cart needed) */}
            <button
              type="button"
              onClick={handleDirectOrder}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-sm sm:text-base flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-[#0B2A4A]/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>
                  Valider et commander {totalQuantity > 1 ? `(${totalQuantity} pièces) ` : ''}• {formatFCFA(totalAmount)}
                </span>
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
              <span>Ajouter au panier {totalQuantity > 1 ? `(${totalQuantity} pièces)` : '(continuer mes achats)'}</span>
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
