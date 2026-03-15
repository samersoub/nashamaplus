import { executeMutation, executeQuery, mutationRef, queryRef } from 'firebase/data-connect';
import { dc } from '../firebase';

export interface UserDC {
  id: string;
  username: string;
  email: string;
  balance: number;
  phoneNumber?: string;
}

export const createUser = async (id: string, username: string, email: string, phoneNumber?: string) => {
  return executeMutation(mutationRef(dc, 'CreateUser', {
    id,
    username,
    email,
    balance: 0,
    phoneNumber: phoneNumber || null
  }));
};

export const getUser = async (id: string) => {
  const result = await executeQuery(queryRef(dc, 'GetUser', { id }));
  const data = result.data as any;
  return data.user as UserDC | null;
};

export const listUsers = async () => {
  const result = await executeQuery(queryRef(dc, 'ListUsers'));
  const data = result.data as any;
  return data.users as UserDC[];
};

export const updateBalance = async (id: string, newBalance: number) => {
  return executeMutation(mutationRef(dc, 'UpdateBalance', { id, newBalance }));
};

export const createTransaction = async (
  userId: string,
  amount: number,
  transactionType: string,
  status: string
) => {
  const id = crypto.randomUUID();
  return executeMutation(mutationRef(dc, 'CreateTransaction', {
    id,
    userId,
    amount,
    transactionType,
    status
  }));
};
