import React from 'react';
import { TrendingUp, ShoppingCart, Calendar, Clock, DollarSign, ArrowUpRight } from 'lucide-react';
import { Order } from '../../types';
import {
  formatFCFA,
  isTodayInDouala,
  isThisWeekInDouala,
  isThisMonthInDouala,
  formatDoualaDateTime,
} from '../../utils/formatters';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface AdminDashboardProps {
  orders: Order[];
  onNavigateToTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, onNavigateToTab }) => {
  // CRITICAL REQUIREMENT: "Les commandes annulées sont exclues de tous les montants."
  // Valid orders are any orders that are not cancelled
  const validOrders = orders.filter((o) => o.status !== 'annulée');

  // Today
  const todayOrders = validOrders.filter((o) => isTodayInDouala(o.createdAt));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  // This Week (starts Monday, Africa/Douala)
  const weekOrders = validOrders.filter((o) => isThisWeekInDouala(o.createdAt));
  const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);

  // This Month (Africa/Douala)
  const monthOrders = validOrders.filter((o) => isThisMonthInDouala(o.createdAt));
  const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

  // Total all-time
  const totalAllTimeRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const cancelledOrdersCount = orders.filter((o) => o.status === 'annulée').length;

  // Recent 5 orders
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Timezone banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#EAF2FB] border border-[#D3E4F7] text-xs text-[#0B2A4A]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#1E63B5]" />
          <span>
            Données calculées en temps réel sur le fuseau horaire <strong>Africa/Douala</strong> (semaine commençant le lundi).
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Commandes annulées exclues de tous les chiffres
        </span>
      </div>

      {/* PWA Mobile App Quick Install Banner for Jessica */}
      <PWAInstallButton
        variant="card"
        label="Installer l'app sur mon téléphone"
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#1E63B5]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aujourd’hui
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2A4A] font-serif">
              {formatFCFA(todayRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-700">{todayOrders.length}</span>
              <span>commande{todayOrders.length > 1 ? 's' : ''} enregistrée{todayOrders.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#1E63B5]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cette semaine
            </span>
            <div className="p-2 rounded-xl bg-[#EAF2FB] text-[#1E63B5]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2A4A] font-serif">
              {formatFCFA(weekRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-700">{weekOrders.length}</span>
              <span>commande{weekOrders.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-[#1E63B5]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ce mois
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2A4A] font-serif">
              {formatFCFA(monthRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-700">{monthOrders.length}</span>
              <span>commande{monthOrders.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
          <span className="text-[11px] text-slate-400 block font-medium">Chiffre d’affaires global</span>
          <span className="text-base sm:text-lg font-bold text-slate-900 font-serif">
            {formatFCFA(totalAllTimeRevenue)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
          <span className="text-[11px] text-slate-400 block font-medium">Total commandes</span>
          <span className="text-base sm:text-lg font-bold text-slate-900">
            {orders.length}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
          <span className="text-[11px] text-slate-400 block font-medium">Enregistrées / Validées</span>
          <span className="text-base sm:text-lg font-bold text-emerald-600">
            {validOrders.length}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70">
          <span className="text-[11px] text-slate-400 block font-medium">Annulées (exclues)</span>
          <span className="text-base sm:text-lg font-bold text-rose-500">
            {cancelledOrdersCount}
          </span>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0B2A4A] font-serif">
              Dernières commandes enregistrées
            </h3>
            <p className="text-xs text-slate-400">
              Synchronisation instantanée avec WhatsApp et Firestore
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('orders')}
            className="text-xs font-semibold text-[#1E63B5] hover:text-[#0B2A4A] flex items-center gap-1 p-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <span>Voir toutes les commandes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Aucune commande reçue pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {order.clientFirstName} {order.clientLastName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'enregistrée'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'acceptée'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'en_livraison'
                          ? 'bg-purple-100 text-purple-800'
                          : order.status === 'livrée'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700 line-through'
                      }`}
                    >
                      {order.status === 'enregistrée'
                        ? 'En attente'
                        : order.status === 'acceptée'
                        ? 'Acceptée'
                        : order.status === 'en_livraison'
                        ? 'En livraison'
                        : order.status === 'livrée'
                        ? 'Livrée'
                        : 'Annulée'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                    <span>{formatDoualaDateTime(order.createdAt)}</span>
                    <span>•</span>
                    <span>{order.cityAndNeighborhood} ({order.deliveryLocation})</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-[#0B2A4A] font-serif text-sm block">
                    {formatFCFA(order.total)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {order.items.length} article{order.items.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
