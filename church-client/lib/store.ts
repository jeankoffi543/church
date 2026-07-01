export interface Product {
  id: string;
  title: string;
  description: string;
  base_price: number;
  images: string[];
  is_digital: boolean;
  status: 'active' | 'draft';
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
}

export interface ProductAttribute {
  name: string; // e.g., 'Couleur', 'Format'
  type: 'text' | 'color' | 'select';
  values: string[]; // for colors: hex chips e.g. ['#ffffff', '#000000', '#b270ff']
}

export interface ProductVariant {
  id: string;
  sku: string;
  price_override?: number; // Null or undefined means use base_price
  stock_count: number;
  attributes: Record<string, string>; // e.g., {"Couleur": "#b270ff", "Format": "Couverture rigide"}
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  variant_id?: string;
  quantity: number;
  price: number;
  selected_attributes?: Record<string, string>;
}

export interface Order {
  id: string;
  user_name: string;
  total_amount: number;
  payment_status: 'paid' | 'pending';
  fulfillment_status: 'preparing' | 'shipped' | 'pickup_at_church';
  items: OrderItem[];
  created_at: string;
}
