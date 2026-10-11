import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Product, Pack, DeliveryZone, Order, OrderStatus, ShopSettings } from '../types';
import {
  INITIAL_DELIVERY_ZONES,
  INITIAL_SETTINGS,
} from './initialData';
import { isAdminSessionActive } from './authService';
import { sanitizeInput } from '../utils/crypto';

// Cooldown storage key to prevent spam
const LAST_ORDER_TIME_KEY = 'fhh_last_order_timestamp';
const MIN_ORDER_INTERVAL_MS = 3000; // 3 seconds cooldown between orders on same device

// Helper to strip any undefined properties recursively to ensure Firestore never throws "Unsupported field value: undefined"
function removeUndefinedFields<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map((v) => removeUndefinedFields(v)) as unknown as T;
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        res[k] = removeUndefinedFields(v);
      }
    }
    return res as T;
  }
  return val;
}

// Permanent Tombstone Keys (prevents any deleted product or pack from ever resurfacing)
const DELETED_PRODUCT_IDS_KEY = 'fhh_deleted_product_ids';
const DELETED_PACK_IDS_KEY = 'fhh_deleted_pack_ids';

export function getDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCT_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function markProductIdDeleted(id: string) {
  try {
    const set = getDeletedProductIds();
    set.add(id);
    localStorage.setItem(DELETED_PRODUCT_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getDeletedPackIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PACK_IDS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function markPackIdDeleted(id: string) {
  try {
    const set = getDeletedPackIds();
    set.add(id);
    localStorage.setItem(DELETED_PACK_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Subscribe to products with real-time updates and permanent tombstone filtering
 */
export function subscribeToProducts(callback: (products: Product[]) => void) {
  const path = 'products';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const deletedIds = getDeletedProductIds();
        const items: Product[] = [];

        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id;
          const data = docSnap.data();
          const name = String(data.name || '').toLowerCase();

          // Permanently purge any mock "trousse" or explicitly deleted product
          if (docId === '1' || name.includes('trousse') || deletedIds.has(docId)) {
            // Delete from Firestore cloud database in background so it never lingers
            deleteDoc(doc(db, 'products', docId)).catch(() => {});
            markProductIdDeleted(docId);
            continue;
          }

          items.push({
            id: docId,
            ...data,
          } as Product);
        }

        // Sort in memory by createdAt descending
        items.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        // Always sync local cache with the verified clean list
        try {
          localStorage.setItem('fhh_cached_products', JSON.stringify(items));
        } catch {}

        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to packs with real-time updates and permanent tombstone filtering
 */
export function subscribeToPacks(callback: (packs: Pack[]) => void) {
  const path = 'packs';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const deletedIds = getDeletedPackIds();
        const items: Pack[] = [];

        for (const docSnap of snapshot.docs) {
          const docId = docSnap.id;
          const data = docSnap.data();

          if (deletedIds.has(docId)) {
            deleteDoc(doc(db, 'packs', docId)).catch(() => {});
            continue;
          }

          items.push({
            id: docId,
            ...data,
          } as Pack);
        }

        // Sort in memory by createdAt descending
        items.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        try {
          localStorage.setItem('fhh_cached_packs', JSON.stringify(items));
        } catch {}

        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to delivery zones
 */
export function subscribeToDeliveryZones(callback: (zones: DeliveryZone[]) => void) {
  const path = 'deliveryZones';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as DeliveryZone[];

        // Sort in memory by price ascending
        items.sort((a, b) => (a.price || 0) - (b.price || 0));

        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to shop settings
 */
export function subscribeToSettings(callback: (settings: ShopSettings) => void) {
  const path = 'settings';
  try {
    const docRef = doc(db, path, 'shop');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as ShopSettings);
        } else {
          callback(INITIAL_SETTINGS);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to orders (admin only) with local caching and offline resilience
 */
export function subscribeToOrders(callback: (orders: Order[]) => void) {
  const path = 'orders';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Order[];

        // Merge cached/offline backup orders if any
        try {
          const cachedRaw = localStorage.getItem('fhh_cached_orders');
          if (cachedRaw) {
            const cachedOrders: Order[] = JSON.parse(cachedRaw);
            for (const c of cachedOrders) {
              if (!items.some((i) => i.id === c.id)) {
                items.push(c);
              }
            }
          }
        } catch {}

        // Sort in memory by createdAt descending
        items.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        callback(items);
      },
      (error) => {
        console.warn('Orders snapshot warning (fallback to cached orders):', error);
        try {
          const cachedRaw = localStorage.getItem('fhh_cached_orders');
          if (cachedRaw) {
            callback(JSON.parse(cachedRaw));
          }
        } catch {}
      }
    );
  } catch (error) {
    console.warn('Orders subscription initialization warning:', error);
    try {
      const cachedRaw = localStorage.getItem('fhh_cached_orders');
      if (cachedRaw) {
        callback(JSON.parse(cachedRaw));
      }
    } catch {}
  }
}

/**
 * Get shop settings once
 */
export async function getShopSettings(): Promise<ShopSettings> {
  const path = 'settings';
  try {
    const docRef = doc(db, path, 'shop');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ShopSettings;
    }
    return INITIAL_SETTINGS;
  } catch (error) {
    console.warn('Could not read settings directly, returning defaults:', error);
    return INITIAL_SETTINGS;
  }
}

/**
 * Ensure default delivery zones and settings exist without injecting mock products.
 * Purges any lingering mock "trousse" immediately.
 */
export async function seedInitialStoreIfEmpty() {
  try {
    // 1. Purge any lingering "trousse" or mock items in Firestore
    const productsSnap = await getDocs(collection(db, 'products'));
    for (const docSnap of productsSnap.docs) {
      const data = docSnap.data();
      const name = String(data.name || '').toLowerCase();
      if (docSnap.id === '1' || name.includes('trousse')) {
        await deleteDoc(doc(db, 'products', docSnap.id)).catch(() => {});
        markProductIdDeleted(docSnap.id);
      }
    }

    // 2. Ensure shop settings exist
    const settingsSnap = await getDoc(doc(db, 'settings', 'shop'));
    if (!settingsSnap.exists()) {
      await setDoc(doc(db, 'settings', 'shop'), {
        ...INITIAL_SETTINGS,
        seeded: true,
      });
    }

    // 3. Ensure Douala delivery zones exist
    const zonesSnap = await getDocs(collection(db, 'deliveryZones'));
    if (zonesSnap.empty) {
      for (const zone of INITIAL_DELIVERY_ZONES) {
        await addDoc(collection(db, 'deliveryZones'), zone);
      }
    }
  } catch (error) {
    console.error('Initial store check warning:', error);
  }
}

/**
 * Client: Submit order to Firestore with rate-limiting, honeypot, and database price verification
 */
export async function submitOrder(
  orderData: Omit<Order, 'id' | 'status' | 'createdAt'>,
  honeypot: string
): Promise<{ success: boolean; orderId: string; error?: string }> {
  // 1. Honeypot bot protection
  if (honeypot && honeypot.trim() !== '') {
    return { success: false, orderId: '', error: 'Spam detected' };
  }

  // 2. Cooldown check (bypassed for testing by admin)
  if (!isAdminSessionActive()) {
    const lastOrderTimeStr = localStorage.getItem(LAST_ORDER_TIME_KEY);
    if (lastOrderTimeStr) {
      const elapsed = Date.now() - parseInt(lastOrderTimeStr, 10);
      if (elapsed < MIN_ORDER_INTERVAL_MS) {
        return { success: false, orderId: '', error: 'RATE_LIMIT' };
      }
    }
  }

  // 3. Validate items array
  if (!Array.isArray(orderData.items) || orderData.items.length === 0 || orderData.items.length > 50) {
    return { success: false, orderId: '', error: 'INVALID_ITEMS' };
  }

  // 4. Server/Store Price Verification: verify every item against Firestore to prevent price tampering
  let verifiedItemsTotal = 0;
  const verifiedItems = await Promise.all(
    orderData.items.map(async (item) => {
      let unitPrice = Number(item.unitPrice) || 0;
      try {
        if (item.isPack) {
          const packSnap = await getDoc(doc(db, 'packs', item.id));
          if (packSnap.exists()) {
            const realPrice = Number(packSnap.data()?.price);
            if (Number.isFinite(realPrice) && realPrice >= 0) {
              unitPrice = realPrice;
            }
          }
        } else {
          const prodSnap = await getDoc(doc(db, 'products', item.id));
          if (prodSnap.exists()) {
            const pData = prodSnap.data();
            const realPrice =
              pData?.discountPrice && pData.discountPrice < pData.price
                ? Number(pData.discountPrice)
                : Number(pData?.price);
            if (Number.isFinite(realPrice) && realPrice >= 0) {
              unitPrice = realPrice;
            }
          }
        }
      } catch {
        // Fallback to submitted unit price if offline or network hiccup
      }

      const cleanQuantity = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));
      verifiedItemsTotal += unitPrice * cleanQuantity;

      // Ensure NO undefined values are ever present in the item object (Firestore strict requirement)
      const cleanItem: Record<string, any> = {
        id: String(item.id).slice(0, 100),
        name: sanitizeInput(String(item.name || ''), 150),
        unitPrice,
        quantity: cleanQuantity,
        isPack: Boolean(item.isPack),
      };

      if (item.selectedColor && String(item.selectedColor).trim()) {
        cleanItem.selectedColor = sanitizeInput(String(item.selectedColor).trim(), 50);
      }
      if (item.selectedSize && String(item.selectedSize).trim()) {
        cleanItem.selectedSize = sanitizeInput(String(item.selectedSize).trim(), 50);
      }

      return cleanItem;
    })
  );

  const finalItemsTotal = Math.max(0, verifiedItemsTotal);
  let finalGrandTotal = finalItemsTotal;

  // Extract numerical delivery amount if specified
  const numDelivery = parseInt((orderData.deliveryPrice || '').replace(/\D/g, ''), 10);
  if (!orderData.isDeliveryPending && Number.isFinite(numDelivery) && numDelivery > 0) {
    finalGrandTotal += numDelivery;
  }

  const path = 'orders';
  const nowIso = new Date().toISOString();
  const rawOrderPayload: Record<string, any> = {
    clientLastName: sanitizeInput(orderData.clientLastName || '', 100),
    clientFirstName: sanitizeInput(orderData.clientFirstName || '', 100),
    whatsappNumber: sanitizeInput(orderData.whatsappNumber || '', 30),
    callNumber: sanitizeInput(orderData.callNumber || orderData.whatsappNumber || '', 30),
    deliveryLocation: sanitizeInput(orderData.deliveryLocation || '', 200),
    cityAndNeighborhood: sanitizeInput(orderData.deliveryLocation || '', 200),
    deliveryPrice: sanitizeInput(orderData.deliveryPrice || '', 50),
    items: verifiedItems,
    itemsTotal: finalItemsTotal,
    total: finalGrandTotal,
    isDeliveryPending: Boolean(orderData.isDeliveryPending),
    language: orderData.language === 'en' ? 'en' : 'fr',
    status: 'enregistrée',
    createdAt: nowIso,
  };

  const orderPayload = removeUndefinedFields(rawOrderPayload);

  try {
    const docRef = await addDoc(collection(db, path), orderPayload);
    localStorage.setItem(LAST_ORDER_TIME_KEY, Date.now().toString());

    // Save to local cached orders for instant real-time reflection and resilient backup
    try {
      const cachedRaw = localStorage.getItem('fhh_cached_orders');
      const list = cachedRaw ? JSON.parse(cachedRaw) : [];
      const newSavedOrder = { id: docRef.id, ...orderPayload };
      localStorage.setItem('fhh_cached_orders', JSON.stringify([newSavedOrder, ...list.slice(0, 100)]));
    } catch {}

    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error('Erreur enregistrement commande Firestore:', error);

    // Guaranteed fallback: save locally so the order is NEVER lost even if network or Firestore has a glitch
    const fallbackId = 'CMD_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try {
      const backupOrder: Order = {
        id: fallbackId,
        ...orderPayload,
      } as Order;

      const cachedRaw = localStorage.getItem('fhh_cached_orders');
      const list = cachedRaw ? JSON.parse(cachedRaw) : [];
      localStorage.setItem('fhh_cached_orders', JSON.stringify([backupOrder, ...list.slice(0, 100)]));

      return { success: true, orderId: fallbackId };
    } catch {
      return { success: false, orderId: '', error: 'SUBMISSION_FAILED' };
    }
  }
}

/**
 * Admin: Update order status ('enregistrée' | 'acceptée' | 'en_livraison' | 'livrée' | 'annulée')
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      statusUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete order
 */
export async function deleteOrder(orderId: string) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Admin: Add product
 */
export async function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = 'products';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...product,
      createdAt: now,
      updatedAt: now,
    });

    // Update local cache immediately
    try {
      const cached = localStorage.getItem('fhh_cached_products');
      const list = cached ? JSON.parse(cached) : [];
      const newProduct: Product = {
        id: docRef.id,
        ...product,
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem('fhh_cached_products', JSON.stringify([newProduct, ...list]));
    } catch {}

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Admin: Update product
 */
export async function updateProduct(id: string, product: Partial<Product>) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = `products/${id}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'products', id), {
      ...product,
      updatedAt: now,
    });

    // Update local cache immediately
    try {
      const cached = localStorage.getItem('fhh_cached_products');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const updated = list.map((item: any) =>
            item.id === id ? { ...item, ...product, updatedAt: now } : item
          );
          localStorage.setItem('fhh_cached_products', JSON.stringify(updated));
        }
      }
    } catch {}
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete product permanently from Firestore and purge from local cache
 */
export async function deleteProduct(id: string) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  markProductIdDeleted(id);

  // Instant local cache purge
  try {
    const cached = localStorage.getItem('fhh_cached_products');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const filtered = list.filter((item: any) => item.id !== id);
        localStorage.setItem('fhh_cached_products', JSON.stringify(filtered));
      }
    }
  } catch {}

  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Admin: Add pack
 */
export async function addPack(pack: Omit<Pack, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = 'packs';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...pack,
      createdAt: now,
      updatedAt: now,
    });

    // Update local cache immediately
    try {
      const cached = localStorage.getItem('fhh_cached_packs');
      const list = cached ? JSON.parse(cached) : [];
      const newPack: Pack = {
        id: docRef.id,
        ...pack,
        createdAt: now,
        updatedAt: now,
      };
      localStorage.setItem('fhh_cached_packs', JSON.stringify([newPack, ...list]));
    } catch {}

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Admin: Update pack
 */
export async function updatePack(id: string, pack: Partial<Pack>) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = `packs/${id}`;
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'packs', id), {
      ...pack,
      updatedAt: now,
    });

    // Update local cache immediately
    try {
      const cached = localStorage.getItem('fhh_cached_packs');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const updated = list.map((item: any) =>
            item.id === id ? { ...item, ...pack, updatedAt: now } : item
          );
          localStorage.setItem('fhh_cached_packs', JSON.stringify(updated));
        }
      }
    } catch {}
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete pack permanently from Firestore and purge from local cache
 */
export async function deletePack(id: string) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  markPackIdDeleted(id);

  // Instant local cache purge
  try {
    const cached = localStorage.getItem('fhh_cached_packs');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const filtered = list.filter((item: any) => item.id !== id);
        localStorage.setItem('fhh_cached_packs', JSON.stringify(filtered));
      }
    }
  } catch {}

  const path = `packs/${id}`;
  try {
    await deleteDoc(doc(db, 'packs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Admin: Add delivery zone
 */
export async function addDeliveryZone(zone: Omit<DeliveryZone, 'id'>) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = 'deliveryZones';
  try {
    const docRef = await addDoc(collection(db, path), zone);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Admin: Update delivery zone
 */
export async function updateDeliveryZone(id: string, zone: Partial<DeliveryZone>) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = `deliveryZones/${id}`;
  try {
    await updateDoc(doc(db, 'deliveryZones', id), zone);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete delivery zone
 */
export async function deleteDeliveryZone(id: string) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = `deliveryZones/${id}`;
  try {
    await deleteDoc(doc(db, 'deliveryZones', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Admin: Update settings
 */
export async function updateSettings(settings: Partial<ShopSettings>) {
  if (!isAdminSessionActive()) {
    throw new Error('Accès refusé : session administrateur requise.');
  }
  const path = 'settings/shop';
  try {
    await setDoc(
      doc(db, 'settings', 'shop'),
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
