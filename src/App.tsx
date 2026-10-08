import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { CartDrawer } from './components/common/CartDrawer';
import { ClientCatalog } from './components/client/ClientCatalog';
import { ProductModal } from './components/client/ProductModal';
import { PackModal } from './components/client/PackModal';
import { CheckoutModal } from './components/client/CheckoutModal';
import { AdminSpace } from './components/admin/AdminSpace';
import { CartProvider, useCart } from './context/CartContext';
import { Product, Pack, DeliveryZone, ShopSettings } from './types';
import {
  subscribeToProducts,
  subscribeToPacks,
  subscribeToDeliveryZones,
  subscribeToSettings,
  seedInitialStoreIfEmpty,
} from './services/storeService';
import { testConnection } from './firebase/config';
import { INITIAL_SETTINGS } from './services/initialData';
import { Send, MapPin, ShieldCheck, Heart, Smartphone } from 'lucide-react';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { MobileNavBar } from './components/client/MobileNavBar';
import { SearchPage } from './components/client/SearchPage';
import {
  isSecretPortalUnlocked,
  unlockSecretPortal,
  isAdminSessionActive,
} from './services/authService';

function StoreApp() {
  const { isCheckoutOpen, setIsCheckoutOpen, language } = useCart();

  // Current URL path with secret portal protection:
  // Anyone typing /admin directly without unlocking via copyright is silently bounced to '/'
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname || '/';
    if (path.startsWith('/admin') && !isSecretPortalUnlocked() && !isAdminSessionActive()) {
      window.history.replaceState({}, '', '/');
      return '/';
    }
    return path;
  });

  // Real-time Firestore state
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(INITIAL_SETTINGS);

  // Selected item modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);

  // Sync route on browser navigation (Back / Forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      if (path.startsWith('/admin') && !isSecretPortalUnlocked() && !isAdminSessionActive()) {
        window.history.replaceState({}, '', '/');
        setCurrentPath('/');
        return;
      }
      setCurrentPath(path);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Test Firestore connection on boot and seed initial catalog if needed
  useEffect(() => {
    testConnection();
    seedInitialStoreIfEmpty();
  }, []);

  // Real-time subscriptions for catalog and settings
  useEffect(() => {
    const unsubProd = subscribeToProducts((items) => {
      setProducts(items);
    });
    const unsubPacks = subscribeToPacks((items) => {
      setPacks(items);
    });
    const unsubZones = subscribeToDeliveryZones((items) => {
      setDeliveryZones(items);
    });
    const unsubSettings = subscribeToSettings((s) => {
      setSettings(s);
    });

    return () => {
      unsubProd?.();
      unsubPacks?.();
      unsubZones?.();
      unsubSettings?.();
    };
  }, []);

  // Inspect current route for direct link: /produit/:id or /pack/:id
  useEffect(() => {
    const matchProd = currentPath.match(/^\/produit\/([a-zA-Z0-9_-]+)/);
    if (matchProd) {
      const prodId = matchProd[1];
      const found = products.find((p) => p.id === prodId);
      if (found) {
        setSelectedProduct(found);
        setSelectedPack(null);
      }
    } else {
      const matchPack = currentPath.match(/^\/pack\/([a-zA-Z0-9_-]+)/);
      if (matchPack) {
        const packId = matchPack[1];
        const found = packs.find((p) => p.id === packId);
        if (found) {
          setSelectedPack(found);
          setSelectedProduct(null);
        }
      }
    }
  }, [currentPath, products, packs]);

  const navigate = (path: string) => {
    // SECURITY GATE: Redirect unauthorized direct attempts to access /admin
    if (path.startsWith('/admin') && !isSecretPortalUnlocked() && !isAdminSessionActive()) {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);

    if (path === '/' || path === '/recherche') {
      setSelectedProduct(null);
      setSelectedPack(null);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedPack(null);
    window.history.pushState({}, '', `/produit/${product.id}`);
    setCurrentPath(`/produit/${product.id}`);
  };

  const handleCloseProductModal = () => {
    setSelectedProduct(null);
    const returnPath = currentPath.startsWith('/recherche') ? '/recherche' : '/';
    window.history.pushState({}, '', returnPath);
    setCurrentPath(returnPath);
  };

  const handleSelectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setSelectedProduct(null);
    window.history.pushState({}, '', `/pack/${pack.id}`);
    setCurrentPath(`/pack/${pack.id}`);
  };

  const handleClosePackModal = () => {
    setSelectedPack(null);
    const returnPath = currentPath.startsWith('/recherche') ? '/recherche' : '/';
    window.history.pushState({}, '', returnPath);
    setCurrentPath(returnPath);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If on admin route, verify portal security before rendering
  if (currentPath.startsWith('/admin')) {
    if (!isSecretPortalUnlocked() && !isAdminSessionActive()) {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
      return null;
    }
    return <AdminSpace onNavigateClient={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-[#EAF2FB] selection:text-[#0B2A4A]">
      {/* Offline connectivity indicator */}
      <OfflineIndicator />

      {/* PWA mobile install notification banner */}
      <PWAInstallBanner />

      {/* Client Header */}
      <Header currentPath={currentPath} onNavigate={navigate} />

      {/* Main Content (Spacious luxury layout with mobile bottom clearance) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-8 py-5 sm:py-14 pb-28 md:pb-14">
        {currentPath === '/recherche' ? (
          <SearchPage
            products={products}
            packs={packs}
            onSelectProduct={handleSelectProduct}
            onSelectPack={handleSelectPack}
            onNavigate={navigate}
          />
        ) : (
          <ClientCatalog
            products={products}
            packs={packs}
            onSelectProduct={handleSelectProduct}
            onSelectPack={handleSelectPack}
            onNavigate={navigate}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      <CartDrawer />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={handleCloseProductModal}
        />
      )}

      {selectedPack && (
        <PackModal
          pack={selectedPack}
          onClose={handleClosePackModal}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          deliveryZones={deliveryZones}
          settings={settings}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}

      {/* Footer (Luxury, Spacious & Clean with mobile clearance) */}
      <footer className="mt-10 sm:mt-28 border-t border-slate-100 bg-slate-50/60 text-slate-600 pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14">
            <div className="md:col-span-5 space-y-2.5 sm:space-y-3">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#0B2A4A]">
                For him and her
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md font-normal">
                Boutique d'élégance et de mode sélective à Douala. Prêt-à-porter de créateur, maroquinerie haut de gamme, souliers de prestige et parfums authentiques livrés directement chez vous.
              </p>
            </div>

            <div className="md:col-span-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold uppercase tracking-widest text-slate-400 text-xs">
                Livraison à Douala & Paiement
              </h4>
              <div className="space-y-2 text-slate-700">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#1E63B5] shrink-0 mt-0.5" />
                  <span>Livraison express à domicile et au bureau (Akwa, Bonanjo, Bonapriso, Makepe, Deido...)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#1E63B5] shrink-0 mt-0.5" />
                  <span>Paiement par dépôt sécurisé (Orange Money / MTN MoMo)</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 space-y-2.5 sm:space-y-3.5 text-xs sm:text-sm">
              <h4 className="font-bold uppercase tracking-widest text-slate-400 text-xs">
                Service Vendeuse WhatsApp
              </h4>
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{settings.whatsappNumber}</span>
              </a>
              <p className="text-xs text-slate-400 font-normal">
                Conseils personnalisés & commandes directes du lundi au samedi.
              </p>
            </div>
          </div>

          <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-center text-xs text-slate-400 gap-4">
            <div>
              <PWAInstallButton variant="footer" label="Installer l'application sur votre téléphone / PC" />
            </div>

            <span
              onClick={() => {
                unlockSecretPortal();
                navigate('/admin');
              }}
              className="cursor-pointer select-none transition-colors hover:text-slate-500 text-xs text-slate-400"
              title=""
            >
              © {new Date().getFullYear()} For him and her • Douala, Cameroun. Tous droits réservés.
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileNavBar
        currentPath={currentPath}
        onNavigate={navigate}
        onScrollToTop={handleScrollToTop}
        whatsappNumber={settings.whatsappNumber}
      />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <StoreApp />
    </CartProvider>
  );
}
