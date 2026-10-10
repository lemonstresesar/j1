import { Order, Language } from '../types';
import { formatFCFA } from './formatters';
import { translations } from '../i18n/translations';

/**
 * Normalizes phone number to international Cameroon format (237XXXXXXXXX)
 */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  // Strip all non-digits
  let digits = rawNumber.replace(/\D/g, '');
  if (digits.startsWith('00237')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('237')) {
    // already has 237
  } else if (digits.length === 9) {
    digits = `237${digits}`;
  }
  return digits;
}

/**
 * Builds the WhatsApp message text in French or English
 */
export function buildWhatsAppMessage(order: Order, lang: Language): string {
  const t = translations[lang];

  const itemsLines = order.items
    .map(item => {
      const details: string[] = [];
      if (item.selectedColor) details.push(`Couleur: ${item.selectedColor}`);
      if (item.selectedSize) details.push(`Taille: ${item.selectedSize}`);
      const variantStr = details.length > 0 ? ` [${details.join(', ')}]` : '';
      return `  • ${item.name}${variantStr} (x${item.quantity}) : ${formatFCFA(item.unitPrice * item.quantity)}`;
    })
    .join('\n');

  const deliveryCostDisplay = order.isDeliveryPending
    ? (lang === 'fr' ? 'À confirmer sur WhatsApp' : 'To be confirmed on WhatsApp')
    : order.deliveryPrice;

  const totalLabel = order.isDeliveryPending
    ? `${formatFCFA(order.itemsTotal)} (${lang === 'fr' ? 'hors livraison' : 'excl. delivery'})`
    : formatFCFA(order.total);

  const lines = [
    `*${t.storeName}* ✨`,
    t.waHello,
    '',
    `👤 *${t.waClient}* : ${order.clientFirstName} ${order.clientLastName}`,
    `📱 *WhatsApp* : ${order.whatsappNumber}`,
    `📞 *${t.callNumber}* : ${order.callNumber}`,
    `📍 *${t.waAddress}* : ${order.cityAndNeighborhood}`,
    `🚚 *${t.waDeliveryPlace}* : ${order.deliveryLocation}`,
    `🛵 *${t.waDeliveryCost}* : ${deliveryCostDisplay}`,
    '',
    `🛍️ *${t.waItemsList}*`,
    itemsLines,
    '',
    `💵 *${t.waTotal}* : ${totalLabel}`,
    `🔖 *${t.waOrderRef}* : #${order.id.slice(-6).toUpperCase()}`,
    '',
    t.waClosing,
  ];

  return lines.join('\n');
}

/**
 * Creates the complete wa.me link with URL-encoded message
 */
export function createWhatsAppUrl(targetNumber: string, message: string): string {
  const cleanNumber = normalizeWhatsAppNumber(targetNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}
