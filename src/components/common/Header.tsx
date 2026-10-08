import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const { itemCount, setIsCartOpen, language, setLanguage } = useCart();
  const t = translations[language];

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdminRoute = currentPath.startsWith('/admin');

  return (
    <header
      className={`sticky top-0 z-40 bg-white/98 backdrop-blur-md transition-[height,box-shadow,border-color,background-color] duration-200 ${
        isScrolled
          ? 'border-b border-slate-200/90 shadow-xs'
          : 'border-b border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]'
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4 transition-[height] duration-200 ${
          isScrolled ? 'h-15 sm:h-16' : 'h-18 sm:h-20'
        }`}
      >
        {/* Brand Logo - Pure Elegant Typography */}
        <div
          onClick={() => onNavigate('/')}
          className="cursor-pointer group flex flex-col items-start select-none shrink-0 min-w-0"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`font-serif font-bold tracking-tight text-[#0B2A4A] group-hover:text-[#1E63B5] transition-colors duration-200 whitespace-nowrap ${
                isScrolled
                  ? 'text-lg sm:text-xl md:text-2xl'
                  : 'text-xl sm:text-xl md:text-2xl lg:text-3xl'
              }`}
            >
              For him and her
            </span>
          </div>
          <span
            className={`font-medium tracking-[0.2em] text-slate-400 uppercase whitespace-nowrap transition-all duration-200 ${
              isScrolled
                ? 'text-[8px] sm:text-[9px] md:text-[10px] pt-0'
                : 'text-[9px] sm:text-[10px] md:text-[11px] pt-0.5'
            }`}
          >
            Douala • Mode & Élégance
          </span>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 shrink-0">
          {/* Search Trigger Button for Dedicated Search Page (Tablet & Desktop only - hidden on mobile) */}
          {!isAdminRoute && (
            <button
              type="button"
              onClick={() => onNavigate('/recherche')}
              className={`hidden sm:flex group items-center gap-1.5 md:gap-2 rounded-xl sm:rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs ${
                currentPath === '/recherche'
                  ? 'bg-[#0B2A4A] text-white border-[#0B2A4A] shadow-xs'
                  : 'border-slate-200/90 bg-slate-100/90 text-[#0B2A4A] hover:bg-[#0B2A4A] hover:text-white hover:border-[#0B2A4A]'
              } ${
                isScrolled
                  ? 'px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs'
                  : 'px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs'
              }`}
              title="Rechercher un article"
              aria-label="Recherche d'articles"
            >
              <Search
                className={`w-4 h-4 shrink-0 transition-colors ${
                  currentPath === '/recherche'
                    ? 'text-white'
                    : 'text-[#0B2A4A] group-hover:text-white'
                }`}
              />
              <span className="font-bold whitespace-nowrap">Rechercher</span>
            </button>
          )}

          {/* PWA Install Button for Customers (Desktop & Tablet) */}
          {!isAdminRoute && (
            <div className="hidden sm:block">
              <PWAInstallButton variant="header-client" />
            </div>
          )}

          {/* Language Switcher (Customer only) */}
          {!isAdminRoute && (
            <div className="flex items-center bg-slate-50 p-0.5 sm:p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'fr'
                    ? 'bg-[#0B2A4A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#0B2A4A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          )}

          {/* Cart Trigger Button */}
          {!isAdminRoute && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className={`relative flex items-center gap-2 rounded-xl sm:rounded-2xl bg-[#0B2A4A] text-white font-semibold hover:bg-[#1E63B5] transition-all duration-200 shadow-md shadow-[#0B2A4A]/15 active:scale-97 cursor-pointer ${
                isScrolled
                  ? 'px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm'
                  : 'px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm'
              }`}
              aria-label={t.cart}
            >
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white shrink-0" />
              <span className="font-bold tracking-wide hidden sm:inline">{t.cart}</span>
              {itemCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-extrabold bg-[#1E63B5] text-white rounded-full ring-2 ring-white">
                  {itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
