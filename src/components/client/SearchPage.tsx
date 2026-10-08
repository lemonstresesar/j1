import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, ArrowLeft, X, Sparkles, ArrowUpDown, Tag, Check, Filter } from 'lucide-react';
import { Product, Pack, ProductGender } from '../../types';
import { ProductCard } from './ProductCard';
import { formatFCFA } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { translations } from '../../i18n/translations';

interface SearchPageProps {
  products: Product[];
  packs: Pack[];
  onSelectProduct: (product: Product) => void;
  onSelectPack: (pack: Pack) => void;
  onNavigate: (path: string) => void;
}

const POPULAR_SUGGESTIONS = [
  'Robe',
  'Parfum',
  'Chaussures',
  'Sac à main',
  'Costume',
  'Gombo',
  'Talon',
  'Montre',
  'Chemise',
];

export const SearchPage: React.FC<SearchPageProps> = ({
  products,
  packs,
  onSelectProduct,
  onSelectPack,
  onNavigate,
}) => {
  const { language } = useCart();
  const t = translations[language];

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Search & Filter State
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<ProductGender | 'all'>('all');
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Auto focus on mount
  useEffect(() => {
    searchInputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Filter visible items
  const visibleProducts = useMemo(() => products.filter((p) => !p.isHidden), [products]);
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

  // Categories list
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

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'packs' || selectedCategory === 'gombo') {
      return [];
    }

    return visibleProducts
      .filter((p) => {
        // Category match
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }

        // Gender match
        if (selectedGender !== 'all' && p.gender !== selectedGender && p.gender !== 'unisexe') {
          return false;
        }

        // Search Query match (Name, description, category)
        if (query.trim()) {
          const q = query.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) {
            return false;
          }
        }

        // Promos match
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
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;
        if (sortBy === 'price_asc') return priceA - priceB;
        if (sortBy === 'price_desc') return priceB - priceA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [visibleProducts, selectedCategory, selectedGender, query, onlyPromos, maxPrice, sortBy]);

  // Filtered Packs
  const filteredPacks = useMemo(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'packs' && selectedCategory !== 'gombo') {
      return [];
    }

    return visiblePacks
      .filter((p) => {
        if (selectedCategory === 'gombo' && !p.isGombo) return false;

        if (query.trim()) {
          const q = query.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchItems = p.items?.some((it) => it.name.toLowerCase().includes(q));
          if (!matchName && !matchDesc && !matchItems) return false;
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
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;
        if (sortBy === 'price_asc') return priceA - priceB;
        if (sortBy === 'price_desc') return priceB - priceA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [visiblePacks, selectedCategory, query, onlyPromos, maxPrice, sortBy]);

  const totalCount = filteredProducts.length + filteredPacks.length;

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setSelectedGender('all');
    setOnlyPromos(false);
    setMaxPrice('');
    setSortBy('newest');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedGender !== 'all' ||
    onlyPromos ||
    maxPrice !== '' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-300">
      {/* Top Header / Back link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0B2A4A] hover:text-[#1E63B5] transition-colors cursor-pointer w-fit py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la boutique</span>
        </button>

        <span className="text-xs text-slate-400 font-medium">
          {totalCount} {totalCount > 1 ? 'résultats trouvés' : 'résultat trouvé'}
        </span>
      </div>

      {/* Main Search Banner */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#0B2A4A] tracking-tight">
            Rechercher un article
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Trouvez rapidement vos vêtements, sacs, souliers, parfums et offres spéciales à Douala.
          </p>
        </div>

        {/* Large Prominent Search Input */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E63B5] absolute left-4 sm:left-5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex : Robe de soirée, Parfum Yves Saint Laurent, Escarpins..."
            className="w-full pl-12 sm:pl-14 pr-12 sm:pr-14 py-4 sm:py-5 rounded-2xl sm:rounded-3xl border-2 border-slate-200 focus:border-[#1E63B5] bg-white text-sm sm:text-base outline-none shadow-sm focus:ring-4 focus:ring-[#1E63B5]/10 transition-all font-medium placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-4 sm:right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Effacer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* Popular Suggestions Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Tag className="w-3 h-3 text-[#1E63B5]" />
            Suggestions :
          </span>
          {POPULAR_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                query.toLowerCase() === tag.toLowerCase()
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs & Advanced Filters Controls */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Categories horizontal list */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none no-scrollbar">
            {categoryTabs.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0B2A4A] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Toggle Filter Drawer */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              showFilters || hasActiveFilters
                ? 'bg-[#0B2A4A] text-white border-[#0B2A4A] shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres avancés</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Sub-filter Rayon (Homme / Femme / Tous) */}
        {selectedCategory !== 'packs' && selectedCategory !== 'gombo' && (
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Rayon :
            </span>
            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200/60">
              {(['all', 'femme', 'homme'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGender(g)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

        {/* Filters Drawer */}
        {showFilters && (
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B2A4A] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#1E63B5]" />
                Options de tri et filtres
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-bold text-[#1E63B5] hover:underline cursor-pointer"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Sort by */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
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

              {/* Max Price */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Prix maximum (FCFA)
                </label>
                <input
                  type="number"
                  placeholder="Ex : 50000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium outline-none focus:border-[#1E63B5]"
                />
              </div>

              {/* Promos only */}
              <div className="flex items-center sm:items-end pb-1 sm:pb-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={onlyPromos}
                    onChange={(e) => setOnlyPromos(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1E63B5] focus:ring-[#1E63B5] border-slate-300 cursor-pointer"
                  />
                  <span>Promotions & Réductions uniquement</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div>
        {totalCount === 0 ? (
          <div className="bg-slate-50/70 rounded-3xl p-10 sm:p-16 text-center border border-slate-200/60 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#0B2A4A]">
              Aucun article correspondant
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {query
                ? `Aucun produit ne correspond à votre recherche « ${query} ». Vérifiez l'orthographe ou essayez un autre mot-clé.`
                : "Aucun article ne correspond aux filtres sélectionnés."}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-6 py-3 rounded-2xl bg-[#0B2A4A] text-white text-xs font-bold hover:bg-[#1E63B5] transition-all shadow-md cursor-pointer"
            >
              Effacer la recherche et les filtres
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Products Grid */}
            {filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6 lg:gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>
            )}

            {/* Packs Grid */}
            {filteredPacks.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#0B2A4A]">
                    Packs correspondants ({filteredPacks.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredPacks.map((pack) => {
                    const hasDiscount = pack.discountPrice && pack.discountPrice < pack.price;
                    const currentPrice = hasDiscount ? pack.discountPrice! : pack.price;
                    const originalPrice = hasDiscount ? pack.price : undefined;

                    return (
                      <article
                        key={pack.id}
                        onClick={() => onSelectPack(pack)}
                        className="cursor-pointer group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-xl hover:border-[#1E63B5]/30 transition-all flex flex-col justify-between"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                          <img
                            src={pack.photo}
                            alt={pack.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                          />
                          {pack.isGombo && (
                            <span className="absolute top-2.5 left-2.5 text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#1E63B5] text-white flex items-center gap-1 shadow-md">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              Gombo
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <h4 className="text-sm sm:text-base font-serif font-bold text-slate-900 group-hover:text-[#1E63B5] transition-colors line-clamp-1">
                            {pack.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {pack.description}
                          </p>
                          <div className="pt-2 flex items-baseline gap-2">
                            <span className="text-base font-bold text-[#0B2A4A] font-serif">
                              {formatFCFA(currentPrice)}
                            </span>
                            {originalPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                {formatFCFA(originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
