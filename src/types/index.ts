export type ProductCategory = 'vetements' | 'chaussures' | 'parfums' | 'sacs' | 'accessoires';

export type ProductGender = 'homme' | 'femme' | 'unisexe';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  gender: ProductGender;
  description: string;
  price: number;
  discountPrice?: number;
  photos: string[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PackItem {
  id?: string;
  name: string;
  price?: number;
  photo?: string;
  productId?: string;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  photo: string;
  items: PackItem[];
  isGombo: boolean;
  gomboEndDate?: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  order?: number;
}

export interface CartItem {
  id: string;
  cartItemId?: string;
  type: 'product' | 'pack';
  name: string;
  price: number;
  originalPrice?: number;
  photo: string;
  quantity: number;
  category?: string;
  gender?: string;
  selectedColor?: string;
  selectedSize?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  isPack: boolean;
  selectedColor?: string;
  selectedSize?: string;
}

export type OrderStatus = 'enregistrée' | 'acceptée' | 'en_livraison' | 'livrée' | 'annulée';

export interface Order {
  id: string;
  clientLastName: string;
  clientFirstName: string;
  whatsappNumber: string;
  callNumber: string;
  cityAndNeighborhood: string;
  deliveryLocation: string;
  deliveryPrice: string; // e.g. "1 500 FCFA" or "à confirmer"
  items: OrderItem[];
  itemsTotal: number;
  total: number;
  isDeliveryPending: boolean;
  language: 'fr' | 'en';
  status: OrderStatus;
  statusUpdatedAt?: string;
  createdAt: string;
}

export interface ShopSettings {
  shopName: string;
  whatsappNumber: string;
  paymentInstructions?: string;
  adminCreated: boolean;
  adminPasswordCode?: string;
  adminUsername?: string;
  updatedAt?: string;
}

export type Language = 'fr' | 'en';
