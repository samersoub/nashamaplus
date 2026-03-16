/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { Loader2 } from 'lucide-react';
import { createUser as createDCUser, getUser as getDCUser } from './services/dataconnect';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Visitor tracking
    const trackVisitor = async () => {
      const today = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'stats', today);
      try {
        const statsDoc = await getDoc(statsRef);
        if (statsDoc.exists()) {
          await updateDoc(statsRef, { visitors: increment(1) });
        } else {
          await setDoc(statsRef, { visitors: 1, date: today });
        }
      } catch (error) {
        console.error('Error tracking visitor:', error);
      }
    };
    trackVisitor();
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const dcUser = await getDCUser(user.uid);
      if (dcUser) {
        setProfile({
          uid: dcUser.id,
          email: dcUser.email,
          displayName: dcUser.username,
          balance: dcUser.balance,
          role: user.email === 'sameralsoub@gmail.com' ? 'admin' : 'user',
          createdAt: new Date().toISOString(), // Fallback
        });
      }
    } catch (error) {
      console.error('Error refreshing profile from Data Connect:', error);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Try to get from Data Connect
          let dcUser = await getDCUser(firebaseUser.uid);
          
          if (!dcUser) {
            // Create in Data Connect if not exists
            await createDCUser(
              firebaseUser.uid,
              firebaseUser.displayName || 'User',
              firebaseUser.email || ''
            );
            dcUser = await getDCUser(firebaseUser.uid);
          }

          if (dcUser) {
            setProfile({
              uid: dcUser.id,
              email: dcUser.email,
              displayName: dcUser.username,
              balance: dcUser.balance,
              role: firebaseUser.email === 'sameralsoub@gmail.com' ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            });
          } else {
            // Fallback to basic profile if DC fails
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              balance: 0,
              role: firebaseUser.email === 'sameralsoub@gmail.com' ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            });
          }

          setLoading(false);
        } catch (error) {
          console.error('Data Connect Auth Error:', error);
          // Fallback on error
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            balance: 0,
            role: firebaseUser.email === 'sameralsoub@gmail.com' ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
          });
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 font-medium">جاري تحميل نشامى بلس...</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin' || (user?.email === 'sameralsoub@gmail.com' && user?.emailVerified);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, refreshProfile }}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route 
              path="/admin" 
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />} 
            />
          </Routes>
        </Layout>
      </Router>
    </AuthContext.Provider>
  );
}

