import React from 'react';
import { Sparkles, Clock, ShoppingBag, ArrowRight } from 'lucide-react';
import { Pack } from '../../types';
import { formatFCFA, formatDoualaDateOnly } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface HeroGomboProps {
  packs: Pack[];
  onSelectPack: (pack: Pack) => void;
}

export const HeroGombo: React.FC<HeroGomboProps> = ({ packs, onSelectPack }) => {
  const { addItem, language } = useCart();
  const t = translations[language];

  // Filter packs that are marked as Gombo, not hidden, and not expired
  const now = new Date();
  const activeGomboPacks = packs.filter((p) => {
    if (!p.isGombo || p.isHidden) return false;
    if (p.gomboEndDate) {
      const end = new Date(p.gomboEndDate);
      return end.getTime() >= now.getTime();
    }
    return true;
  });

  if (activeGomboPacks.length === 0) {
    return null;
  }

  // Display the first active Gombo pack as featured hero
  const featured = activeGomboPacks[0];
  const hasDiscount = featured.discountPrice && featured.discountPrice < featured.price;
  const currentPrice = hasDiscount ? featured.discountPrice! : featured.price;
  const originalPrice = hasDiscount ? featured.price : undefined;

  return (
    <section className="mb-8 sm:mb-16">
      <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#0B2A4A] via-[#0F355E] to-[#07192C] text-white p-4 sm:p-10 lg:p-12 shadow-2xl border border-white/10">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#1E63B5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-center">
          
          {/* Text and offer details */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-[11px] sm:text-xs font-extrabold uppercase tracking-widest border border-white/15 shadow-sm">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {t.gomboTitle}
              </span>

              {featured.gomboEndDate && (
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-300 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
                  <span>{t.gomboEnds} {formatDoualaDateOnly(featured.gomboEndDate)}</span>
                </span>
              )}
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold font-serif leading-tight tracking-tight">
                {featured.name}
              </h2>
              <p className="text-xs sm:text-base text-slate-300 leading-relaxed max-w-xl font-normal line-clamp-2 sm:line-clamp-none">
                {featured.description}
              </p>
            </div>

            {/* Included items */}
            {featured.items && featured.items.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.packContents}
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {featured.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] sm:text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 text-white/95 border border-white/10 backdrop-blur-xs font-medium"
                    >
                      ✓ {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price display and CTA buttons */}
            <div className="pt-1 sm:pt-2 flex flex-wrap items-baseline gap-3 sm:gap-4">
              <span className="text-2xl sm:text-4xl font-extrabold text-white font-serif tracking-tight">
                {formatFCFA(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-sm sm:text-xl text-slate-400 line-through">
                  {formatFCFA(originalPrice)}
                </span>
              )}
              {hasDiscount && (
                <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Économie : {formatFCFA(originalPrice! - currentPrice)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-4 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => onSelectPack(featured)}
                className="py-3 px-3 sm:py-4 sm:px-8 rounded-xl sm:rounded-2xl bg-[#1E63B5] hover:bg-[#18539c] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-[#1E63B5]/30 transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>{t.addToCart}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectPack(featured)}
                className="py-3 px-3 sm:py-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300 border border-white/15 cursor-pointer truncate"
              >
                <span>Détails</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Featured pack image */}
          <div className="lg:col-span-5 order-first lg:order-last">
            <div
              onClick={() => onSelectPack(featured)}
              className="cursor-pointer group relative overflow-hidden rounded-2xl sm:rounded-3xl aspect-[16/10] sm:aspect-[4/3] lg:aspect-square bg-slate-900 shadow-2xl border border-white/10"
            >
              <img
                src={featured.photo}
                alt={featured.name}
                className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

