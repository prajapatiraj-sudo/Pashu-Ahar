export interface Product {
  id: string | number;
  name_en: string;
  name_gu: string;
  name_hi?: string;
  unit: string;
  price: number;
  purchase_price: number;
  stock_quantity: number;
  low_stock_threshold?: number;
  deleted?: boolean;
  deletedAt?: any;
}

export interface Customer {
  id: string | number;
  name: string;
  phone: string;
  address: string;
  village?: string;
  total_outstanding: number;
  deleted?: boolean;
  deletedAt?: any;
}

export interface Invoice {
  id: string | number;
  customer_id: string | number;
  customer_name?: string;
  date: string;
  subtotal: number;
  previous_outstanding: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  items?: any[];
  deleted?: boolean;
  deletedAt?: any;
}

export interface InvoiceItem {
  id: string | number;
  invoice_id: string | number;
  product_id: string | number;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Payment {
  id: string | number;
  customer_id: string | number;
  date: string;
  amount: number;
  method: string;
  note: string;
  deleted?: boolean;
  deletedAt?: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  role: 'admin' | 'sales';
}
