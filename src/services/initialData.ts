import { Product, Pack, DeliveryZone, ShopSettings } from '../types';

export const INITIAL_SETTINGS: ShopSettings = {
  shopName: 'For him and her',
  whatsappNumber: '+237 6 96 60 55 86',
  paymentInstructions: 'Paiement sécurisé par Orange Money ou MTN Mobile Money. Envoyez la confirmation de dépôt sur WhatsApp.',
  adminCreated: false,
};

export const INITIAL_DELIVERY_ZONES: Omit<DeliveryZone, 'id'>[] = [
  { name: 'Akwa / Centre-ville', price: 1000, order: 1 },
  { name: 'Bonanjo / Port', price: 1000, order: 2 },
  { name: 'Bonapriso', price: 1000, order: 3 },
  { name: 'Deïdo / Bessengue', price: 1500, order: 4 },
  { name: 'Bali / Koumassi', price: 1500, order: 5 },
  { name: 'Makepe / Rhone Poulenc', price: 2000, order: 6 },
  { name: 'Bonamoussadi / Denver', price: 2000, order: 7 },
  { name: 'Kotto / Sable', price: 2000, order: 8 },
  { name: 'Ndogbong / Bassa', price: 2000, order: 9 },
  { name: 'Logpom / Bassong', price: 2500, order: 10 },
  { name: 'Bepanda / Omnisports', price: 2000, order: 11 },
  { name: 'Yassa / Japoma', price: 3000, order: 12 },
  { name: 'Village / Ndokoti', price: 2000, order: 13 },
  { name: 'Bonabéri', price: 3000, order: 14 },
];

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [];

export const INITIAL_PACKS: Omit<Pack, 'id'>[] = [];

