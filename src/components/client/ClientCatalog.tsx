import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X, Tag, Sparkles } from 'lucide-react';
import { Product, Pack, ProductCategory, ProductGender } from '../../types';
import { ProductCard } from './ProductCard';
import { HeroGombo } from './HeroGombo';
import { formatFCFA } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface ClientCatalogProps {
  products: Product[];
  packs: Pack[];
  onSelectProduct: (product: Product) => void;
  onSelectPack: (pack: Pack) => void;
  onNavigate?: (path: string) => void;
}

export const ClientCatalog: React.FC<ClientCatalogProps> = ({
  products,
  packs,
  onSelectProduct,
  onSelectPack,
  onNavigate,
}) => {
  const { addItem, language } = useCart();
  const t = translations[language];

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<ProductGender | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Available categories list
  const categoryTabs = [
    { id: 'all', label: t.cat_all },
    { id: 'vetements', label: t.cat_vetements },
    { id: 'chaussures', label: t.cat_chaussures },
    { id: 'parfums', label: t.cat_parfums },
    { id: 'sacs', label: t.cat_sacs },
    { id: 'accessoires', label: t.cat_accessoires },
    { id: 'packs', label: t.cat_packs },
    { id: 'gombo', label: t.cat_gombo },
  ];

  // Filter visible products (never show hidden)
  const visibleProducts = useMemo(() => {
    return products.filter((p) => !p.isHidden);
  }, [products]);

  // Filter visible packs (never show hidden, and gombo must be valid if filtering by gombo)
  const visiblePacks = useMemo(() => {
    const now = Date.now();
    return packs.filter((p) => {
      if (p.isHidden) return false;
      if (p.isGombo && p.gomboEndDate) {
        return new Date(p.gomboEndDate).getTime() >= now;
      }
      return true;
    });
  }, [packs]);

  // Processed and filtered products
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'packs' || selectedCategory === 'gombo') {
      return [];
    }

    return visibleProducts.filter((p) => {
      // Category match
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Gender match
      if (selectedGender !== 'all' && p.gender !== selectedGender && p.gender !== 'unisexe') {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      // Promo match
      if (onlyPromos) {
        const hasDiscount = p.discountPrice && p.discountPrice < p.price;
        if (!hasDiscount) return false;
      }

      // Max price match
      if (maxPrice !== '') {
        const activePrice = p.discountPrice || p.price;
        if (activePrice > maxPrice) return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = a.discountPrice || a.price;
      const priceB = b.discountPrice || b.price;

      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      // Newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [visibleProducts, selectedCategory, selectedGender, searchQuery, onlyPromos, maxPrice, sortBy]);

  // Processed filtered packs
  const filteredPacks = useMemo(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'packs' && selectedCategory !== 'gombo') {
      return [];
    }

    return visiblePacks.filter((p) => {
      if (selectedCategory === 'gombo' && !p.isGombo) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      if (onlyPromos) {
        const hasDiscount = p.discountPrice && p.discountPrice < p.price;
        if (!hasDiscount) return false;
      }

      if (maxPrice !== '') {
        const activePrice = p.discountPrice || p.price;
        if (activePrice > maxPrice) return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = a.discountPrice || a.price;
      const priceB = b.discountPrice || b.price;

      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [visiblePacks, selectedCategory, searchQuery, onlyPromos, maxPrice, sortBy]);

  const totalResultsCount = filteredProducts.length + filteredPacks.length;

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedGender('all');
    setSearchQuery('');
    setOnlyPromos(false);
    setMaxPrice('');
    setSortBy('newest');
    setShowFilterDrawer(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedGender !== 'all' ||
    searchQuery.trim() !== '' ||
    onlyPromos ||
    maxPrice !== '' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-6 sm:space-y-14">
      {/* Featured Gombo / Pack banner at top if available and looking at general catalog */}
      {(selectedCategory === 'all' || selectedCategory === 'gombo') && (
        <HeroGombo packs={visiblePacks} onSelectPack={onSelectPack} />
      )}

      {/* Navigation & Filter Bar */}
      <section id="catalog-category-section" className="space-y-4 sm:space-y-6 scroll-mt-20 sm:scroll-mt-24">
        {/* Categories Horizontal Minimalist Bar with Quick Search Trigger */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 border-b border-slate-100 pb-2">
          {/* Categories list */}
          <div className="flex gap-1.5 sm:gap-2.5 overflow-x-auto pb-1 max-w-full scrollbar-none no-scrollbar">
            {categoryTabs.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold shrink-0 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#0B2A4A] text-white shadow-md shadow-[#0B2A4A]/15 scale-102'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Quick Search & Filters trigger group */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('/recherche')}
                className="hidden sm:flex group items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-100/90 hover:bg-[#0B2A4A] text-[#0B2A4A] hover:text-white text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                title="Rechercher un article"
              >
                <Search className="w-3.5 h-3.5 text-[#0B2A4A] group-hover:text-white transition-colors" />
                <span>Recherche</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
                showFilterDrawer || hasActiveFilters
                  ? 'bg-[#0B2A4A] text-white border-[#0B2A4A] shadow-md shadow-[#0B2A4A]/15'
                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.filters}</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Quiet Sub-filter Homme / Femme / Tous */}
        {selectedCategory !== 'packs' && selectedCategory !== 'gombo' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Rayon :
            </span>
            <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/50">
              {(['all', 'femme', 'homme'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGender(g)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedGender === g
                      ? 'bg-white text-[#0B2A4A] shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {g === 'all' ? t.all : g === 'femme' ? t.women : t.men}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Filters Drawer */}
        {showFilterDrawer && (
          <div className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B2A4A]">
                Filtres avancés
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-[#1E63B5] hover:underline cursor-pointer"
                >
                  {t.resetFilters}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
              {/* Sort by */}
              <div>
                <label className="block font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#1E63B5]" />
                  <span>{t.sort}</span>
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-[#1E63B5]"
                >
                  <option value="newest">{t.sortNewest}</option>
                  <option value="price_asc">{t.sortPriceAsc}</option>
                  <option value="price_desc">{t.sortPriceDesc}</option>
                </select>
              </div>

              {/* Price filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Budget maximum (FCFA)
                </label>
                <input
                  type="number"
                  step={5000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ex : 50000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-[#1E63B5]"
                />
              </div>

              {/* Promo only checkbox */}
              <div className="flex items-end">
                <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 w-full cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={onlyPromos}
                    onChange={(e) => setOnlyPromos(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0B2A4A] focus:ring-[#1E63B5]"
                  />
                  <span className="font-bold text-slate-800">{t.promotionsOnly}</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Catalog Grid */}
      <section className="space-y-8">
        <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0B2A4A] tracking-tight">
              {selectedCategory === 'packs'
                ? 'Nos Packs & Coffrets'
                : selectedCategory === 'gombo'
                ? 'Gombo de la semaine'
                : selectedCategory === 'vetements'
                ? 'Vêtements de créateur'
                : selectedCategory === 'chaussures'
                ? 'Chaussures & Escarpins'
                : selectedCategory === 'parfums'
                ? 'Parfums & Essences'
                : selectedCategory === 'sacs'
                ? 'Sacs & Maroquinerie'
                : selectedCategory === 'accessoires'
                ? 'Montres & Accessoires'
                : 'Collection For him and her'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Articles authentiques disponibles immédiatement à Douala
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {totalResultsCount} {totalResultsCount > 1 ? 'articles' : 'article'}
          </span>
        </div>

        {totalResultsCount === 0 ? (
          <div className="bg-slate-50/70 rounded-3xl p-16 text-center border border-slate-200/60 space-y-4 max-w-lg mx-auto">
            <h3 className="text-lg font-serif font-bold text-[#0B2A4A]">{t.emptyTitle}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.emptyMessage}</p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-2 px-6 py-3 rounded-2xl bg-[#0B2A4A] text-white text-xs font-bold hover:bg-[#1E63B5] transition-all shadow-md cursor-pointer"
            >
              {t.resetFilters}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Products Grid */}
            {filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>
            )}

            {/* Packs section if displayed */}
            {filteredPacks.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[#0B2A4A]">
                    Packs Exclusifs & Gombo
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPacks.map((pack) => {
                    const hasDiscount = pack.discountPrice && pack.discountPrice < pack.price;
                    const currentPrice = hasDiscount ? pack.discountPrice! : pack.price;
                    const originalPrice = hasDiscount ? pack.price : undefined;

                    return (
                      <article
                        key={pack.id}
                        onClick={() => onSelectPack(pack)}
                        className="cursor-pointer group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#1E63B5]/30 hover:-translate-y-1 transition-all duration-400 flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                            <img
                              src={pack.photo}
                              alt={pack.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-700 ease-out"
                            />
                            {pack.isGombo && (
                              <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#1E63B5] text-white flex items-center gap-1.5 shadow-md">
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                Gombo de la semaine
                              </span>
                            )}
                          </div>

                          <div className="p-5 sm:p-6 space-y-2.5">
                            <h4 className="text-base font-serif font-bold text-slate-900 group-hover:text-[#1E63B5] transition-colors line-clamp-1">
                              {pack.name}
                            </h4>

                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                              {pack.description}
                            </p>

                            {pack.items && pack.items.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-1.5">
                                {pack.items.slice(0, 3).map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg"
                                  >
                                    ✓ {item.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-5 sm:p-6 pt-0 flex items-center justify-between border-t border-slate-100/80 mt-4">
                          <div className="flex flex-col pt-3">
                            <span className="text-lg sm:text-xl font-bold text-[#0B2A4A] font-serif">
                              {formatFCFA(currentPrice)}
                            </span>
                            {originalPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                {formatFCFA(originalPrice)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem({
                                id: pack.id,
                                type: 'pack',
                                name: pack.name,
                                price: currentPrice,
                                originalPrice,
                                photo: pack.photo,
                              });
                            }}
                            className="mt-3 px-4 py-2.5 rounded-xl bg-[#0B2A4A] text-white hover:bg-[#1E63B5] text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            {t.addToCart}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
