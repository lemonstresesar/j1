import React from 'react';
import { ShoppingBag, Eye, ArrowUpRight } from 'lucide-react';
import { Product } from '../../types';
import { formatFCFA } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addItem, language } = useCart();
  const t = translations[language];

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const currentPrice = hasDiscount ? product.discountPrice! : product.price;
  const originalPrice = hasDiscount ? product.price : undefined;

  const coverPhoto =
    product.photos && product.photos.length > 0
      ? product.photos[0]
      : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80';

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
    <article className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-slate-100/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#1E63B5]/20 hover:-translate-y-1 transition-all duration-300 ease-out">
      {/* Image container */}
      <div
        onClick={() => onSelect(product)}
        className="cursor-pointer relative aspect-[3/4] w-full bg-slate-100 overflow-hidden"
      >
        <img
          src={coverPhoto}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-700 ease-out"
        />

        {/* Promo tag if active */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-500 text-white shadow-md">
              Promo
            </span>
          </div>
        )}

        {/* Quick view hover icon */}
        <div className="absolute inset-0 bg-[#0B2A4A]/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="p-3 bg-white/95 text-[#0B2A4A] rounded-2xl shadow-xl transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5 text-xs font-bold">
            <Eye className="w-4 h-4" />
            <span>Voir l'article</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
        <div>
          {/* Unboxed clean metadata kicker */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">
            <span>{categoryLabel}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{genderLabel}</span>
          </div>

          <h3
            onClick={() => onSelect(product)}
            className="cursor-pointer text-xs sm:text-[15px] font-semibold text-slate-900 group-hover:text-[#1E63B5] transition-colors line-clamp-2 leading-snug"
          >
            {product.name}
          </h3>
        </div>

        <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between gap-2">
          {/* Price */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-base md:text-lg font-bold text-[#0B2A4A] font-serif tracking-tight truncate">
              {formatFCFA(currentPrice)}
            </span>
            {originalPrice && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through truncate">
                {formatFCFA(originalPrice)}
              </span>
            )}
          </div>

          {/* Add to cart / Configure options button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shrink-0 shadow-xs shadow-[#0B2A4A]/20"
            aria-label="Ajouter au panier et choisir les options"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="inline sm:hidden">Ajouter</span>
            <span className="hidden sm:inline">Ajouter au panier</span>
          </button>
        </div>
      </div>
    </article>
  );
};

