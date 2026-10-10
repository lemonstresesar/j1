import React, { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { DeliveryZone, ShopSettings, Order } from '../../types';
import { formatFCFA } from '../../utils/formatters';
import { translations } from '../../i18n/translations';
import { submitOrder } from '../../services/storeService';
import { buildWhatsAppMessage, createWhatsAppUrl } from '../../utils/whatsapp';

import { sanitizeInput } from '../../utils/crypto';

interface CheckoutModalProps {
  deliveryZones: DeliveryZone[];
  settings: ShopSettings;
  onClose: () => void;
  onOrderCompleted?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  deliveryZones,
  settings,
  onClose,
  onOrderCompleted,
}) => {
  const { items, subtotal, clearCart, directCheckoutItem, setDirectCheckoutItem, language } = useCart();
  const t = translations[language];

  // If a direct checkout item was selected, process only that item; otherwise use the whole cart
  const isDirectPurchase = !!directCheckoutItem;
  const activeItems = directCheckoutItem ? [directCheckoutItem] : items;
  const activeSubtotal = directCheckoutItem
    ? directCheckoutItem.price * directCheckoutItem.quantity
    : subtotal;

  // Form fields
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [callNumber, setCallNumber] = useState('');
  const [cityAndNeighborhood, setCityAndNeighborhood] = useState('Douala - ');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [customDestination, setCustomDestination] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot trap

  // Errors & Status
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Success Confirmation State
  const [confirmedOrder, setConfirmedOrder] = useState<{
    id: string;
    whatsappUrl: string;
    totalDisplay: string;
  } | null>(null);

  const isOtherDestination = selectedZoneId === 'OTHER';
  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId);

  const deliveryPriceAmount = isOtherDestination ? 0 : selectedZone ? selectedZone.price : 0;
  const isDeliveryPending = isOtherDestination || !selectedZone;
  const grandTotal = activeSubtotal + deliveryPriceAmount;

  const handleModalClose = () => {
    setDirectCheckoutItem(null);
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!lastName.trim()) errs.lastName = t.errRequired;
    if (!firstName.trim()) errs.firstName = t.errRequired;

    // Validate phone numbers: Cameroon numbers typically 9 digits, e.g., 6XXXXXXXX
    const cleanWa = whatsappNumber.replace(/\D/g, '');
    if (!cleanWa || cleanWa.length < 8) {
      errs.whatsappNumber = t.errPhoneInvalid;
    }

    const cleanCall = callNumber.replace(/\D/g, '');
    if (!cleanCall || cleanCall.length < 8) {
      errs.callNumber = t.errPhoneInvalid;
    }

    if (!cityAndNeighborhood.trim() || cityAndNeighborhood.trim() === 'Douala -') {
      errs.cityAndNeighborhood = t.errRequired;
    }

    if (!selectedZoneId) {
      errs.deliveryZone = t.errDeliveryZoneRequired;
    } else if (isOtherDestination && !customDestination.trim()) {
      errs.customDestination = t.errRequired;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validate()) return;
    if (activeItems.length === 0) return;

    setIsSubmitting(true);

    try {
      const deliveryLocationLabel = isOtherDestination
        ? `Autre : ${customDestination.trim()}`
        : selectedZone!.name;

      const deliveryPriceLabel = isOtherDestination
        ? (language === 'fr' ? 'À confirmer sur WhatsApp' : 'To be confirmed on WhatsApp')
        : formatFCFA(selectedZone!.price);

      const orderPayload = {
        clientLastName: sanitizeInput(lastName, 100),
        clientFirstName: sanitizeInput(firstName, 100),
        whatsappNumber: sanitizeInput(whatsappNumber, 30),
        callNumber: sanitizeInput(callNumber, 30),
        cityAndNeighborhood: sanitizeInput(cityAndNeighborhood, 200),
        deliveryLocation: sanitizeInput(deliveryLocationLabel, 200),
        deliveryPrice: deliveryPriceLabel,
        items: activeItems.map((i) => ({
          id: i.id,
          name: i.name,
          unitPrice: i.price,
          quantity: i.quantity,
          isPack: i.type === 'pack',
          selectedColor: i.selectedColor,
          selectedSize: i.selectedSize,
        })),
        itemsTotal: activeSubtotal,
        total: grandTotal,
        isDeliveryPending,
        language,
      };

      // Step 1: Save to Firestore
      const result = await submitOrder(orderPayload, honeypot);

      if (!result.success) {
        if (result.error === 'RATE_LIMIT') {
          setSubmissionError(t.errRateLimit);
        } else {
          setSubmissionError(t.errSubmissionFailed);
        }
        setIsSubmitting(false);
        return;
      }

      // Step 2: Build WhatsApp Message and wa.me link
      const completedOrder: Order = {
        ...orderPayload,
        id: result.orderId,
        status: 'enregistrée',
        createdAt: new Date().toISOString(),
      };

      const waMsg = buildWhatsAppMessage(completedOrder, language);
      const recipientPhone = settings.whatsappNumber || '+237696605586';
      const whatsappUrl = createWhatsAppUrl(recipientPhone, waMsg);

      // Step 3: Set Confirmation state and clear appropriate item(s)
      setConfirmedOrder({
        id: result.orderId,
        whatsappUrl,
        totalDisplay: isDeliveryPending
          ? `${formatFCFA(activeSubtotal)} (${t.totalExcludingDelivery})`
          : formatFCFA(grandTotal),
      });

      if (isDirectPurchase) {
        setDirectCheckoutItem(null);
      } else {
        clearCart();
      }
      if (onOrderCompleted) onOrderCompleted();

      // Attempt non-blocking direct open or navigation
      try {
        const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        if (!opened) {
          // Popup blocked by browser/iframe, user will click the large button on confirmation page
        }
      } catch {
        // Fallback gracefully handled by confirmation screen
      }
    } catch (err) {
      console.error('Order checkout error:', err);
      setSubmissionError(t.errSubmissionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-[#0B2A4A] text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif">
              {confirmedOrder
                ? t.orderSuccessTitle
                : isDirectPurchase
                ? 'Commander cet article'
                : t.checkoutTitle}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {confirmedOrder
                ? t.orderSuccessIntro
                : isDirectPurchase
                ? 'Finalisation de votre commande directe à Douala'
                : t.checkoutSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 3: Order Confirmation Screen */}
        {confirmedOrder ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
                {t.orderSuccessTitle}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {t.whatsappPrompt}
              </p>
              <div className="inline-block bg-slate-100 px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-700">
                {t.orderReference} : <span className="font-bold text-[#0B2A4A]">#{confirmedOrder.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>

            {/* Guaranteed WhatsApp Clickable Link */}
            <div className="pt-2">
              <a
                href={confirmedOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <Send className="w-5 h-5" />
                <span>{t.openWhatsAppDirectly}</span>
              </a>
            </div>

            {/* Payment by deposit instructions notice */}
            <div className="p-4 rounded-2xl bg-[#EAF2FB] border border-[#D3E4F7] space-y-1.5 text-xs text-slate-800">
              <div className="flex items-center gap-2 font-bold text-[#0B2A4A]">
                <ShieldCheck className="w-4 h-4 text-[#1E63B5]" />
                <span>{t.paymentNoticeTitle}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {settings.paymentInstructions || t.paymentNoticeBody}
              </p>
            </div>

            <button
              type="button"
              onClick={handleModalClose}
              className="w-full py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {t.returnHome}
            </button>
          </div>
        ) : (
          /* STEP 1 & 2: Checkout Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Honeypot invisible spam field */}
            <input
              type="text"
              name="honeypot_field"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {/* Direct item preview card if direct purchase */}
            {isDirectPurchase && directCheckoutItem && (
              <div className="p-3.5 bg-[#EAF2FB] rounded-2xl border border-[#D3E4F7] flex items-center gap-3 animate-in fade-in">
                <img
                  src={directCheckoutItem.photo}
                  alt={directCheckoutItem.name}
                  className="w-14 h-14 object-cover rounded-xl bg-white border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-extrabold text-[#1E63B5] uppercase tracking-wider flex items-center gap-1">
                    <span>⚡ Commande directe</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {directCheckoutItem.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                    <span className="font-extrabold text-[#0B2A4A]">
                      {directCheckoutItem.quantity} × {formatFCFA(directCheckoutItem.price)}
                    </span>
                    {directCheckoutItem.selectedColor && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-semibold text-slate-700">
                        Couleur : {directCheckoutItem.selectedColor}
                      </span>
                    )}
                    {directCheckoutItem.selectedSize && (
                      <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[10px] font-semibold text-slate-700">
                        Taille : {directCheckoutItem.selectedSize}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {submissionError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submissionError}</span>
              </div>
            )}

            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.clientLastName} *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex : Kamdem"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm ${
                    errors.lastName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#1E63B5]'
                  } outline-none`}
                />
                {errors.lastName && <p className="text-[10px] text-rose-500 mt-1">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.clientFirstName} *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex : Sandrine"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm ${
                    errors.firstName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#1E63B5]'
                  } outline-none`}
                />
                {errors.firstName && <p className="text-[10px] text-rose-500 mt-1">{errors.firstName}</p>}
              </div>
            </div>

            {/* Phone numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.whatsappNumber} *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="6 96 60 55 86"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm ${
                    errors.whatsappNumber ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#1E63B5]'
                  } outline-none`}
                />
                <span className="text-[10px] text-slate-400">{t.whatsappHelper}</span>
                {errors.whatsappNumber && <p className="text-[10px] text-rose-500 mt-0.5">{errors.whatsappNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.callNumber} *
                </label>
                <input
                  type="tel"
                  required
                  value={callNumber}
                  onChange={(e) => setCallNumber(e.target.value)}
                  placeholder="6 77 00 11 22"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm ${
                    errors.callNumber ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#1E63B5]'
                  } outline-none`}
                />
                <span className="text-[10px] text-slate-400">{t.callHelper}</span>
                {errors.callNumber && <p className="text-[10px] text-rose-500 mt-0.5">{errors.callNumber}</p>}
              </div>
            </div>

            {/* City and neighborhood */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.cityAndNeighborhood} *
              </label>
              <input
                type="text"
                required
                value={cityAndNeighborhood}
                onChange={(e) => setCityAndNeighborhood(e.target.value)}
                placeholder={t.cityPlaceholder}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm ${
                  errors.cityAndNeighborhood ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#1E63B5]'
                } outline-none`}
              />
              {errors.cityAndNeighborhood && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.cityAndNeighborhood}</p>
              )}
            </div>

            {/* Delivery zone selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.deliveryLocation} *
              </label>
              <select
                required
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white ${
                  errors.deliveryZone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 focus:border-[#1E63B5]'
                } outline-none`}
              >
                <option value="">{t.selectLocation}</option>
                {deliveryZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} (+{formatFCFA(zone.price)})
                  </option>
                ))}
                <option value="OTHER">📍 {t.otherDestination}</option>
              </select>
              {errors.deliveryZone && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.deliveryZone}</p>
              )}
            </div>

            {/* Custom destination input if "Autre destination" selected */}
            {isOtherDestination && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-900">
                  {t.customLocationPlaceholder} *
                </label>
                <input
                  type="text"
                  required
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  placeholder="Ex : Yaoundé, Bafoussam, Limbé, ou zone reculée..."
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs sm:text-sm bg-white outline-none"
                />
                <p className="text-[11px] text-amber-700 font-medium">
                  💡 {t.deliveryFee} : <span className="font-bold">{t.deliveryPending}</span>
                </p>
                {errors.customDestination && (
                  <p className="text-[10px] text-rose-600">{errors.customDestination}</p>
                )}
              </div>
            )}

            {/* Order summary breakdown */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t.itemsTotal} ({activeItems.length} {activeItems.length === 1 ? t.item : t.items})</span>
                <span className="font-semibold text-slate-900">{formatFCFA(activeSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.deliveryFee}</span>
                <span className="font-semibold text-[#1E63B5]">
                  {isDeliveryPending ? t.deliveryPending : formatFCFA(deliveryPriceAmount)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm sm:text-base font-bold text-[#0B2A4A]">
                <span>{t.grandTotal}</span>
                <div className="text-right">
                  <span className="font-serif">
                    {isDeliveryPending ? formatFCFA(activeSubtotal) : formatFCFA(grandTotal)}
                  </span>
                  {isDeliveryPending && (
                    <span className="block text-[10px] text-slate-500 font-normal">
                      *{t.totalExcludingDelivery}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#0B2A4A]/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? t.submitting : t.sendOrderButton}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
