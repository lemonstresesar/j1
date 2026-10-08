import React, { useState } from 'react';
import {
  Send,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  RotateCcw,
  Trash2,
  Truck,
  CheckCheck,
  Check,
  Volume2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { formatFCFA, formatDoualaDateTime, isTodayInDouala } from '../../utils/formatters';
import { updateOrderStatus, deleteOrder } from '../../services/storeService';
import { normalizeWhatsAppNumber } from '../../utils/whatsapp';
import { playNewOrderSound } from '../../utils/notificationSound';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminOrdersProps {
  orders: Order[];
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ orders }) => {
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, OrderStatus>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);

  const handleSetStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // 1. Optimistic update for instant UI feedback
    setOptimisticStatuses((prev) => ({ ...prev, [orderId]: nextStatus }));

    // 2. Persist to Firestore
    try {
      await updateOrderStatus(orderId, nextStatus);
    } catch (err) {
      console.error('Error updating order status:', err);
      // Rollback on failure
      setOptimisticStatuses((prev) => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
      alert('Erreur lors de la mise à jour du statut.');
    }
  };

  const executeDeleteOrder = async () => {
    if (!orderToDelete) return;
    const targetId = orderToDelete.id;

    // 1. Instantly close modal (0ms)
    setOrderToDelete(null);

    // 2. Instantly remove from screen
    setOptimisticDeletedIds((prev) => [...prev, targetId]);

    // 3. Permanently delete from Google Cloud Firestore
    try {
      await deleteOrder(targetId);
    } catch (err) {
      console.error('Error permanently deleting order:', err);
      setOptimisticDeletedIds((prev) => prev.filter((id) => id !== targetId));
    }
  };

  const getClientWhatsAppUrl = (order: Order, customMessage?: string) => {
    const cleanNumber = normalizeWhatsAppNumber(order.whatsappNumber);
    const defaultMsg = `Bonjour ${order.clientFirstName} ${order.clientLastName}, je vous contacte concernant votre commande #${order.id.slice(-6).toUpperCase()} chez For him and her Douala.`;
    const text = encodeURIComponent(customMessage || defaultMsg);
    return `https://wa.me/${cleanNumber}?text=${text}`;
  };

  const handleTestSound = () => {
    playNewOrderSound();
    setSoundPlayed(true);
    setTimeout(() => setSoundPlayed(false), 1500);
  };

  // Filter logic with optimistic state
  const activeOrders = orders
    .filter((o) => !optimisticDeletedIds.includes(o.id))
    .map((o) => ({
      ...o,
      status: optimisticStatuses[o.id] || o.status,
    }));

  const filteredOrders = activeOrders.filter((order) => {
    // 1. Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;

    // 2. Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = `${order.clientFirstName} ${order.clientLastName}`.toLowerCase().includes(term);
      const matchPhone = order.whatsappNumber.includes(term) || order.callNumber.includes(term);
      const matchLocation =
        order.cityAndNeighborhood.toLowerCase().includes(term) ||
        order.deliveryLocation.toLowerCase().includes(term);
      const matchRef = order.id.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchLocation && !matchRef) return false;
    }

    // 3. Date / period filter
    if (filterPeriod === 'today') {
      return isTodayInDouala(order.createdAt);
    } else if (filterPeriod === 'yesterday') {
      const orderDate = new Date(order.createdAt);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return orderDate.toDateString() === yesterday.toDateString();
    } else if (filterPeriod === 'week') {
      const orderTime = new Date(order.createdAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return orderTime >= sevenDaysAgo;
    } else if (filterPeriod === 'custom' && customDate) {
      const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
      return orderDateStr === customDate;
    }

    return true;
  });

  const countPending = activeOrders.filter((o) => o.status === 'enregistrée').length;
  const countAccepted = activeOrders.filter((o) => o.status === 'acceptée').length;
  const countInDelivery = activeOrders.filter((o) => o.status === 'en_livraison').length;
  const countDelivered = activeOrders.filter((o) => o.status === 'livrée').length;
  const countCancelled = activeOrders.filter((o) => o.status === 'annulée').length;

  return (
    <div className="space-y-6">
      {/* Top Bar with Search & Notifications Info */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, téléphone, quartier, réf..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period buttons */}
            <button
              type="button"
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterPeriod === 'all'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toutes
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterPeriod === 'today'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Aujourd’hui
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterPeriod === 'yesterday'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hier
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterPeriod === 'week'
                  ? 'bg-[#0B2A4A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 derniers jours
            </button>

            {/* Custom date */}
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setFilterPeriod('custom');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-none cursor-pointer"
            />

            {/* Sound alert test */}
            <button
              type="button"
              onClick={handleTestSound}
              title="Tester le carillon sonore des nouvelles commandes"
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Volume2 className={`w-3.5 h-3.5 ${soundPlayed ? 'text-amber-500 animate-spin' : ''}`} />
              <span className="hidden sm:inline">{soundPlayed ? 'Carillon joué !' : 'Tester le son'}</span>
            </button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Filtrer par statut :</span>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#0B2A4A] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({activeOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('enregistrée')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'enregistrée'
                ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/40'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            {countPending > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            <span>En attente ({countPending})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('acceptée')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'acceptée'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/40'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80'
            }`}
          >
            Acceptées ({countAccepted})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('en_livraison')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'en_livraison'
                ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/40'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/80'
            }`}
          >
            En livraison ({countInDelivery})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('livrée')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'livrée'
                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            Livrées ({countDelivered})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('annulée')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              statusFilter === 'annulée'
                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/40'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80'
            }`}
          >
            Annulées ({countCancelled})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-400 border border-slate-200/80 space-y-2">
            <Package className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-medium">Aucune commande trouvée pour ces critères.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.status === 'enregistrée';
            const isAccepted = order.status === 'acceptée';
            const isInDelivery = order.status === 'en_livraison';
            const isDelivered = order.status === 'livrée';
            const isCancelled = order.status === 'annulée';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 shadow-xs ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/15'
                    : isAccepted
                    ? 'border-blue-300 bg-blue-50/10'
                    : isInDelivery
                    ? 'border-purple-300 bg-purple-50/10'
                    : isDelivered
                    ? 'border-emerald-300 bg-emerald-50/10'
                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                {/* Header row: Ref, Date, Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#0B2A4A] bg-[#EAF2FB] px-2.5 py-1 rounded-lg">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDoualaDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    {isPending && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Nouvelle commande • En attente</span>
                      </span>
                    )}
                    {isAccepted && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Commande Acceptée</span>
                      </span>
                    )}
                    {isInDelivery && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                        <span>En cours de livraison</span>
                      </span>
                    )}
                    {isDelivered && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Livrée avec succès</span>
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 line-through">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Commande Annulée</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main details grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-4 text-xs">
                  {/* Client info (4 cols) */}
                  <div className="md:col-span-4 space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Client
                      </span>
                      <span className="text-sm font-bold text-slate-900 block">
                        {order.clientFirstName} {order.clientLastName}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">WhatsApp :</span>
                        <span className="font-semibold text-slate-800">{order.whatsappNumber}</span>
                        <a
                          href={getClientWhatsAppUrl(
                            order,
                            `Bonjour ${order.clientFirstName}, je confirme que votre commande #${order.id.slice(-6).toUpperCase()} chez For him and her Douala a bien été acceptée.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors cursor-pointer"
                          title="Discuter sur WhatsApp"
                        >
                          <Send className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Appel normal :</span>
                        <a
                          href={`tel:${order.callNumber}`}
                          className="font-semibold text-[#1E63B5] hover:underline flex items-center gap-1"
                        >
                          <span>{order.callNumber}</span>
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="pt-1 space-y-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                          Quartier & Ville
                        </span>
                        <span className="text-slate-800 font-semibold">{order.cityAndNeighborhood}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                          Lieu exact de livraison
                        </span>
                        <span className="text-slate-700 font-medium block">{order.deliveryLocation}</span>
                        <span className="text-slate-500 block text-[11px] pt-0.5">
                          Frais de zone : {order.deliveryPrice}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items list (5 cols) */}
                  <div className="md:col-span-5 space-y-2 md:border-l md:border-slate-100 md:pl-4">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      Articles commandés ({order.items.length})
                    </span>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 block">{item.name}</span>
                            <span className="text-[11px] text-slate-500">
                              Quantité : {item.quantity} × {formatFCFA(item.unitPrice)}
                            </span>
                          </div>
                          <span className="font-bold text-[#0B2A4A] font-serif">
                            {formatFCFA(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Total & Order Status Actions (3 cols) */}
                  <div className="md:col-span-3 space-y-3 md:border-l md:border-slate-100 md:pl-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Montant Total
                      </span>
                      <div className="text-xl sm:text-2xl font-extrabold text-[#0B2A4A] font-serif">
                        {formatFCFA(order.total)}
                      </div>
                      {order.isDeliveryPending && (
                        <span className="text-[10px] text-amber-600 block mt-0.5">
                          *Frais de livraison à confirmer sur WhatsApp
                        </span>
                      )}
                    </div>

                    {/* Status Progression Actions */}
                    <div className="space-y-2 pt-2">
                      {/* Step 1: If Pending -> Accept button is prominent! */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleSetStatus(order.id, 'acceptée')}
                          className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Accepter la commande</span>
                        </button>
                      )}

                      {/* Step 2: If Accepted -> Pass to Delivery or Mark Delivered */}
                      {isAccepted && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(order.id, 'en_livraison')}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Passer en livraison</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(order.id, 'livrée')}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Marquer comme livrée</span>
                          </button>
                        </div>
                      )}

                      {/* Step 3: If In Delivery -> Mark Delivered */}
                      {isInDelivery && (
                        <button
                          type="button"
                          onClick={() => handleSetStatus(order.id, 'livrée')}
                          className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                          <span>Confirmer la livraison</span>
                        </button>
                      )}

                      {/* Direct WhatsApp Contact Button */}
                      <a
                        href={getClientWhatsAppUrl(
                          order,
                          isAccepted
                            ? `Bonjour ${order.clientFirstName}, votre commande #${order.id.slice(-6).toUpperCase()} a été acceptée par la boutique For him and her.`
                            : undefined
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Écrire sur WhatsApp</span>
                      </a>

                      {/* Secondary actions row: Cancel & Delete */}
                      <div className="flex items-center gap-2 pt-1">
                        {!isCancelled ? (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(order.id, 'annulée')}
                            className="flex-1 py-1.5 px-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Annuler</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(order.id, 'enregistrée')}
                            className="flex-1 py-1.5 px-2.5 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Rétablir</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Supprimer définitivement cette commande de la base"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation modal for order deletion */}
      <ConfirmModal
        isOpen={Boolean(orderToDelete)}
        title="Supprimer définitivement cette commande ?"
        message={`Êtes-vous sûre de vouloir supprimer définitivement la commande #${orderToDelete?.id.slice(-6).toUpperCase()} de ${orderToDelete?.clientFirstName} ${orderToDelete?.clientLastName} ?`}
        confirmLabel="Supprimer la commande"
        cancelLabel="Garder la commande"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={executeDeleteOrder}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
};
