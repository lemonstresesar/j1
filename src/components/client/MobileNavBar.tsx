import React from 'react';
import { ShoppingBag, Search, Store, MessageCircle, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatFCFA } from '../../utils/formatters';

interface MobileNavBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onScrollToTop: () => void;
  whatsappNumber?: string;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentPath,
  onNavigate,
  onScrollToTop,
  whatsappNumber = '+237 6 96 60 55 86',
}) => {
  const { itemCount, subtotal, setIsCartOpen } = useCart();

  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Bonjour, je visite votre boutique For him and her et j'aimerais des conseils sur un article."
  )}`;

  const isHomeActive = currentPath === '/' || currentPath.startsWith('/produit') || currentPath.startsWith('/pack');
  const isSearchActive = currentPath === '/recherche';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Floating Cart Quick Banner if cart has items */}
      {itemCount > 0 && (
        <div className="px-3 pb-2 pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#0B2A4A] text-white flex items-center justify-between shadow-xl shadow-[#0B2A4A]/25 border border-white/10 active:scale-98 transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1E63B5] text-white text-[11px] font-extrabold flex items-center justify-center">
                {itemCount}
              </span>
              <span className="text-xs font-bold">Voir mon panier</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-serif">
              <span>{formatFCFA(subtotal)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav
        aria-label="Navigation mobile"
        className="pointer-events-auto bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-5px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-area-pb"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 items-center">
          {/* Boutique / Accueil */}
          <button
            type="button"
            onClick={() => {
              onNavigate('/');
              onScrollToTop();
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              isHomeActive && !isSearchActive
                ? 'text-[#0B2A4A] font-bold scale-105'
                : 'text-slate-500 hover:text-[#0B2A4A]'
            }`}
          >
            <Store className={`w-5 h-5 ${isHomeActive && !isSearchActive ? 'text-[#0B2A4A]' : 'text-slate-500'}`} />
            <span className={`text-[10px] mt-1 ${isHomeActive && !isSearchActive ? 'text-[#0B2A4A] font-bold' : 'text-slate-500'}`}>
              Boutique
            </span>
          </button>

          {/* Recherche (Opens Dedicated Search Page) */}
          <button
            type="button"
            onClick={() => onNavigate('/recherche')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              isSearchActive
                ? 'text-[#1E63B5] font-bold scale-105'
                : 'text-slate-500 hover:text-[#0B2A4A]'
            }`}
          >
            <Search className={`w-5 h-5 ${isSearchActive ? 'text-[#1E63B5]' : 'text-slate-500'}`} />
            <span className={`text-[10px] mt-1 ${isSearchActive ? 'text-[#1E63B5] font-bold' : 'text-slate-500'}`}>
              Recherche
            </span>
          </button>

          {/* Panier with live badge */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-[#0B2A4A] transition-all cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-slate-600" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#1E63B5] text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-600 mt-1">Panier</span>
          </button>

          {/* WhatsApp direct assist */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-emerald-700 hover:text-emerald-800 transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 mt-1">WhatsApp</span>
          </a>
        </div>
      </nav>
    </div>
  );
};
