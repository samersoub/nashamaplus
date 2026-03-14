export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  balance: number;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  description: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  serviceId: string;
  serviceName: string;
  playerAppId: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Deposit {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'waiting' | 'approved' | 'rejected';
  createdAt: string;
}
