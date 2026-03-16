import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserDC {
  uid: string;
  displayName: string;
  email: string;
  balance: number;
  role: 'user' | 'moderator' | 'admin';
  phoneNumber?: string;
}

export const createUser = async (uid: string, displayName: string, email: string, phoneNumber?: string) => {
  const userRef = doc(db, 'users', uid);
  return setDoc(userRef, {
    uid,
    displayName,
    email,
    balance: 0,
    role: 'user',
    phoneNumber: phoneNumber || null,
    createdAt: new Date().toISOString()
  });
};

export const getUser = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserDC;
  }
  return null;
};

export const listUsers = async () => {
  const usersRef = collection(db, 'users');
  const querySnapshot = await getDocs(query(usersRef));
  return querySnapshot.docs.map(doc => doc.data() as UserDC);
};

export const updateBalance = async (uid: string, newBalance: number) => {
  const userRef = doc(db, 'users', uid);
  return updateDoc(userRef, { balance: newBalance });
};

export const createTransaction = async (
  userId: string,
  amount: number,
  transactionType: string,
  status: string
) => {
  const id = crypto.randomUUID();
  const transactionRef = doc(db, 'transactions', id);
  return setDoc(transactionRef, {
    id,
    userId,
    amount,
    transactionType,
    status,
    createdAt: new Date().toISOString()
  });
};
