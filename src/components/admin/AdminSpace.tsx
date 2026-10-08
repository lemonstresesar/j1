import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  MapPin,
  ClipboardList,
  Settings,
  LogOut,
  Store,
  ShieldCheck,
  Bell,
  X,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  Product,
  Pack,
  DeliveryZone,
  Order,
  ShopSettings,
} from '../../types';
import {
  subscribeToAuth,
  logoutAdmin,
  isAdminSessionActive,
} from '../../services/authService';
import {
  subscribeToProducts,
  subscribeToPacks,
  subscribeToDeliveryZones,
  subscribeToOrders,
  subscribeToSettings,
} from '../../services/storeService';
import { playNewOrderSound, sendBrowserNotification } from '../../utils/notificationSound';
import { formatFCFA } from '../../utils/formatters';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { AdminProducts } from './AdminProducts';
import { AdminPacks } from './AdminPacks';
import { AdminDeliveryZones } from './AdminDeliveryZones';
import { AdminOrders } from './AdminOrders';
import { AdminSettings } from './AdminSettings';
import { ConfirmModal } from '../common/ConfirmModal';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { OfflineIndicator } from '../common/OfflineIndicator';

// 30 minutes idle logout
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface AdminSpaceProps {
  onNavigateClient?: () => void;
}

export const AdminSpace: React.FC<AdminSpaceProps> = ({ onNavigateClient }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => isAdminSessionActive());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Real-time store state
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: 'For him and her',
    whatsappNumber: '+237 6 96 60 55 86',
    adminCreated: false,
  });

  // Real-time order notification tracking
  const initialOrdersLoadedRef = useRef(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const [newOrderNotification, setNewOrderNotification] = useState<{
    id: string;
    clientName: string;
    total: number;
  } | null>(null);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to auth state
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Idle timer for automatic logout
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsAdminLoggedIn(false);
        logoutAdmin();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer));
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [isAdminLoggedIn]);

  // Real-time Firestore subscriptions for Admin
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const unsubProd = subscribeToProducts(setProducts);
    const unsubPacks = subscribeToPacks(setPacks);
    const unsubZones = subscribeToDeliveryZones(setDeliveryZones);
    const unsubOrders = subscribeToOrders(setOrders);
    const unsubSettings = subscribeToSettings(setSettings);

    return () => {
      unsubProd?.();
      unsubPacks?.();
      unsubZones?.();
      unsubOrders?.();
      unsubSettings?.();
    };
  }, [isAdminLoggedIn]);

  // Real-time Sound & Browser Notification on incoming order
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    if (!initialOrdersLoadedRef.current) {
      // First snapshot: register existing IDs without alert
      knownOrderIdsRef.current = new Set(orders.map((o) => o.id));
      initialOrdersLoadedRef.current = true;
      return;
    }

    // Find any new order with status 'enregistrée'
    const newArrivals = orders.filter(
      (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'enregistrée'
    );

    // Update set of known IDs
    orders.forEach((o) => knownOrderIdsRef.current.add(o.id));

    if (newArrivals.length > 0) {
      const latest = newArrivals[0];

      // 1. Play chime sound
      playNewOrderSound();

      // 2. Browser push notification
      sendBrowserNotification('Nouvelle commande reçue !', {
        body: `De ${latest.clientFirstName} ${latest.clientLastName} - ${formatFCFA(latest.total)}`,
      });

      // 3. In-app banner alert
      setNewOrderNotification({
        id: latest.id,
        clientName: `${latest.clientFirstName} ${latest.clientLastName}`,
        total: latest.total,
      });
    }
  }, [orders]);

  // Direct login screen with Nom (jessica) & Code (jtm)
  if (!isAdminLoggedIn) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setIsAdminLoggedIn(true);
        }}
        onBackToStore={onNavigateClient}
      />
    );
  }

  const pendingOrdersCount = orders.filter((o) => o.status === 'enregistrée').length;

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'orders', label: 'Commandes', icon: ClipboardList, badge: pendingOrdersCount },
    { id: 'products', label: 'Produits', icon: Package, count: products.length },
    { id: 'packs', label: 'Packs & Gombos', icon: Layers, count: packs.length },
    { id: 'zones', label: 'Lieux de livraison', icon: MapPin, count: deliveryZones.length },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const handleGoToClient = () => {
    if (onNavigateClient) {
      onNavigateClient();
    } else {
      window.history.pushState({}, '', '/');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      {/* Offline connectivity indicator */}
      <OfflineIndicator />

      {/* Top Header - Solid & Fixed without covering content */}
      <header className="sticky top-0 z-40 bg-[#0B2A4A] text-white border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-sm sm:text-base leading-tight tracking-tight text-white whitespace-nowrap">
                For him and her
              </h1>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">
                Espace Vendeuse
              </span>
            </div>
          </div>

          {/* DESKTOP NAVIGATION TABS (Shown on PC/Laptop/Tablet - eliminating bottom bar on PC) */}
          <nav aria-label="Navigation principale vendeuse" className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/20 text-amber-300 shadow-xs'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-300'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Group */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Primary Button to switch to Client Storefront */}
            <button
              type="button"
              onClick={handleGoToClient}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B2A4A] text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
              title="Passer du côté vendeuse au côté client"
            >
              <Store className="w-4 h-4 text-[#0B2A4A]" />
              <span className="hidden sm:inline">Voir la boutique</span>
              <span className="sm:hidden">Boutique</span>
            </button>

            {/* PWA Install Button */}
            <div className="hidden sm:block">
              <PWAInstallButton variant="header-admin" label="Installer l'app" />
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-600/90 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-white/10 hover:border-transparent cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Medium Screen Sub-nav (for tablets / medium PC screens) */}
        <div className="hidden md:flex lg:hidden px-4 py-2 bg-[#082038] border-t border-white/10 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/20 text-amber-300'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Floating Real-time Order Alert Banner */}
      {newOrderNotification && (
        <div className="sticky top-16 z-30 bg-gradient-to-r from-amber-500 to-amber-600 text-[#0B2A4A] px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300 border-b border-amber-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full bg-white text-amber-600 flex items-center justify-center font-bold shrink-0 animate-bounce">
                <Bell className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="font-extrabold text-xs sm:text-sm text-white">
                  🔔 Nouvelle commande reçue !
                </span>{' '}
                <span className="text-xs font-medium text-amber-950">
                  Client : <strong>{newOrderNotification.clientName}</strong> ({formatFCFA(newOrderNotification.total)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setNewOrderNotification(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#0B2A4A] text-white hover:bg-[#1E63B5] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <span>Consulter</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setNewOrderNotification(null)}
                className="p-1 rounded-lg text-amber-900 hover:text-[#0B2A4A] hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Fermer l'alerte"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area:
          - On mobile (<md): pb-32 to clear the mobile bottom bar
          - On PC (md+): pb-12 because navigation is at the top, perfectly preventing any element masking!
      */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-32 md:pb-14">
        {activeTab === 'dashboard' && (
          <AdminDashboard orders={orders} onNavigateToTab={setActiveTab} />
        )}

        {activeTab === 'orders' && (
          <AdminOrders orders={orders} />
        )}

        {activeTab === 'products' && (
          <AdminProducts products={products} />
        )}

        {activeTab === 'packs' && (
          <AdminPacks packs={packs} products={products} />
        )}

        {activeTab === 'zones' && (
          <AdminDeliveryZones zones={deliveryZones} />
        )}

        {activeTab === 'settings' && (
          <AdminSettings settings={settings} />
        )}
      </main>

      {/* MOBILE ONLY: Fixed Bottom Navigation Bar (<md screens).
          Hidden on PC/Desktop to prevent any masking when scrolling down!
      */}
      <nav
        aria-label="Navigation mobile espace vendeuse"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B2A4A]/95 backdrop-blur-xl border-t border-white/15 shadow-[0_-10px_35px_rgba(11,42,74,0.35)] safe-area-pb"
      >
        <div className="max-w-md mx-auto px-2 py-2">
          <div className="grid grid-cols-6 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-amber-300 font-bold shadow-xs scale-102'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-amber-300' : ''}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0B2A4A] animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 truncate max-w-full text-center ${isActive ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                    {item.label === 'Tableau de bord' ? 'Dash' : item.label === 'Packs & Gombos' ? 'Packs' : item.label === 'Lieux de livraison' ? 'Lieux' : item.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Logout confirmation modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Se déconnecter ?"
        message="Voulez-vous vraiment vous déconnecter de votre espace de gestion vendeuse ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Rester connectée"
        isDestructive={false}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          setIsAdminLoggedIn(false);
          await logoutAdmin();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
