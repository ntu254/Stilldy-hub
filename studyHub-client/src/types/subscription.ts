export interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  storageLimit: number;
  durationDays: number;
  isActive: boolean;
  description: string | null;
  features: string[];
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseRequest {
  planId: string;
  couponCode?: string | null;
}

export interface PurchaseResponse {
  checkoutUrl: string;
  orderCode: number;
}

export interface PaymentStatusResponse {
  _id: string;
  userId: string;
  planId: string;
  orderCode: number;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
  checkoutUrl: string;
  couponCode: string | null;
  planName: string;
  planPrice: number;
  storageLimit: number;
  durationDays: number;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  expiredAt?: string;
}

export interface UpgradePreviewResponse {
  originalPrice: number;
  remainingValueOffset: number;
  finalAmountToPay: number;
  isUpgrade: boolean;
}

export interface Subscription {
  _id: string;
  userId: string;
  planId: SubscriptionPlan | string;
  startDate: string;
  endDate: string;
  status: 'active' | 'cancelled' | 'expired';
  paymentId: string;
}
