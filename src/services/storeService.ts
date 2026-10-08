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
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Product, Pack, DeliveryZone, Order, OrderStatus, ShopSettings } from '../types';
import {
  INITIAL_DELIVERY_ZONES,
  INITIAL_PRODUCTS,
  INITIAL_PACKS,
  INITIAL_SETTINGS,
} from './initialData';

// Cooldown storage key to prevent spam
const LAST_ORDER_TIME_KEY = 'fhh_last_order_timestamp';
const MIN_ORDER_INTERVAL_MS = 45000; // 45 seconds between orders on same device

/**
 * Subscribe to products with real-time updates
 */
export function subscribeToProducts(callback: (products: Product[]) => void) {
  const path = 'products';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Product[];
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
 * Subscribe to packs with real-time updates
 */
export function subscribeToPacks(callback: (packs: Pack[]) => void) {
  const path = 'packs';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Pack[];
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
    const q = query(collection(db, path), orderBy('price', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as DeliveryZone[];
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
 * Subscribe to orders (admin only)
 */
export function subscribeToOrders(callback: (orders: Order[]) => void) {
  const path = 'orders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Order[];
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
 * Ensure default delivery zones and settings exist without injecting mock products
 */
export async function seedInitialStoreIfEmpty() {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'shop'));
    if (!settingsSnap.exists()) {
      await setDoc(doc(db, 'settings', 'shop'), {
        ...INITIAL_SETTINGS,
        seeded: true,
      });
    }

    // Ensure Douala delivery zones exist
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
 * Client: Submit order to Firestore with rate-limiting and honeypot validation
 */
export async function submitOrder(
  orderData: Omit<Order, 'id' | 'status' | 'createdAt'>,
  honeypot: string
): Promise<{ success: boolean; orderId: string; error?: string }> {
  // 1. Honeypot bot protection
  if (honeypot && honeypot.trim() !== '') {
    return { success: false, orderId: '', error: 'Spam detected' };
  }

  // 2. Cooldown check
  const lastOrderTimeStr = localStorage.getItem(LAST_ORDER_TIME_KEY);
  if (lastOrderTimeStr) {
    const elapsed = Date.now() - parseInt(lastOrderTimeStr, 10);
    if (elapsed < MIN_ORDER_INTERVAL_MS) {
      return { success: false, orderId: '', error: 'RATE_LIMIT' };
    }
  }

  const path = 'orders';
  try {
    const nowIso = new Date().toISOString();
    const orderPayload = {
      ...orderData,
      status: 'enregistrée',
      createdAt: nowIso,
    };

    const docRef = await addDoc(collection(db, path), orderPayload);
    localStorage.setItem(LAST_ORDER_TIME_KEY, Date.now().toString());

    return { success: true, orderId: docRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return { success: false, orderId: '', error: 'SUBMISSION_FAILED' };
  }
}

/**
 * Admin: Update order status ('enregistrée' | 'acceptée' | 'en_livraison' | 'livrée' | 'annulée')
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
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
export async function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const path = 'products';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...product,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Admin: Update product
 */
export async function updateProduct(id: string, product: Partial<Product>) {
  const path = `products/${id}`;
  try {
    await updateDoc(doc(db, 'products', id), {
      ...product,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete product
 */
export async function deleteProduct(id: string) {
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
export async function addPack(pack: Omit<Pack, 'id' | 'createdAt' | 'updatedAt'>) {
  const path = 'packs';
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, path), {
      ...pack,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Admin: Update pack
 */
export async function updatePack(id: string, pack: Partial<Pack>) {
  const path = `packs/${id}`;
  try {
    await updateDoc(doc(db, 'packs', id), {
      ...pack,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Delete pack
 */
export async function deletePack(id: string) {
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
