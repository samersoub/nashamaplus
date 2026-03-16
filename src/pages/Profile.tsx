import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Order, Deposit } from '../types';
import { Wallet, History, Send, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, ArrowUpRight, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { createTransaction } from '../services/dataconnect';
import { WHATSAPP_NUMBER } from '../constants';

export const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (!user) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const depositsQuery = query(
      collection(db, 'deposits'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
      setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit)));
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeDeposits();
    };
  }, [user]);

  const [submittedAmount, setSubmittedAmount] = useState('');

  const handleDepositRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !depositAmount) return;

    setIsDepositing(true);
    setSubmittedAmount(depositAmount);
    try {
      // Create transaction in Data Connect
      await createTransaction(
        user.uid,
        parseFloat(depositAmount),
        'deposit',
        'pending'
      );

      const depositData: Omit<Deposit, 'id'> = {
        userId: user.uid,
        userEmail: profile.email,
        amount: parseFloat(depositAmount),
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'deposits'), depositData);

      setDepositSuccess(true);
      const amountToSubmit = depositAmount;
      setDepositAmount('');

      // Construct WhatsApp URL and redirect
      const message = `مرحباً أدمن، أود إيداع ${amountToSubmit} دينار في محفظتي في نشامى بلس. بريدي الإلكتروني هو: ${profile.email}`;
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      // Direct open to avoid popup blockers
      window.open(whatsappUrl, '_blank');

      await refreshProfile();
      setTimeout(() => setDepositSuccess(false), 15000);
    } catch (error) {
      console.error('Deposit request failed:', error);
    } finally {
      setIsDepositing(false);
    }
  };

  const parseDate = (date: any) => {
    if (!date) return new Date();
    if (typeof date === 'string') return new Date(date);
    if (date?.toDate) return date.toDate();
    return new Date(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Wallet Section */}
        <div className="md:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-primary via-primary-dark to-accent p-8 rounded-[2.5rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 bg-white/10 px-3 py-1 rounded-full">المحفظة</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium opacity-70">الرصيد المتاح</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black font-display tracking-tight">{profile?.balance.toFixed(2)}</h2>
                  <span className="text-lg font-bold opacity-80">دينار</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="glass-card p-8 rounded-[2.5rem] space-y-6 border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-black text-slate-900">شحن الرصيد</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">أدخل المبلغ الذي ترغب في شحنه، وسيتم تحويلك للواتساب لإتمام العملية.</p>

            <form onSubmit={handleDepositRequest} className="space-y-4">
              <div className="relative group">
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pr-4 pl-14 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-lg"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">دينار</span>
              </div>
              <button
                disabled={isDepositing}
                className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-lg shadow-lg shadow-primary/25 active:scale-95 transition-transform"
              >
                {isDepositing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>طلب شحن</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {depositSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-bold border border-green-100">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>تم إرسال الطلب! جاري التحويل إلى واتساب...</span>
                </div>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`مرحباً أدمن، أود إيداع ${submittedAmount} دينار في محفظتي في نشامى بلس. بريدي الإلكتروني هو: ${profile?.email}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 text-white rounded-2xl font-black text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                >
                  <MessageCircle className="w-5 h-5" />
                  اضغط هنا إذا لم يتم تحويلك تلقائياً
                </a>
              </motion.div>
            )}
          </div>
        </div>

        {/* History Section */}
        <div className="md:col-span-2 space-y-8">
          <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/50">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-black text-slate-900 text-lg">الطلبات الأخيرة</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">{orders.length} طلب</span>
            </div>
            <div className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <History className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-medium">لا توجد طلبات بعد.</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${order.status === 'completed' ? 'bg-green-100 text-green-600' :
                        order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                        {order.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                          order.status === 'pending' ? <Clock className="w-6 h-6" /> :
                            <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{order.serviceName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID:</span>
                          <p className="text-xs font-mono text-primary font-bold">{order.playerAppId}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 text-lg">-{order.amount} <span className="text-xs">دينار</span></p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{parseDate(order.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'long' })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/50">
            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Send className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-black text-slate-900 text-lg">سجل الشحن</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {deposits.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <Wallet className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-medium">لا توجد طلبات شحن بعد.</p>
                </div>
              ) : (
                deposits.map(deposit => (
                  <div key={deposit.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${deposit.status === 'approved' ? 'bg-green-100 text-green-600' :
                        deposit.status === 'waiting' ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                        {deposit.status === 'approved' ? <CheckCircle2 className="w-6 h-6" /> :
                          deposit.status === 'waiting' ? <Clock className="w-6 h-6" /> :
                            <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">طلب شحن رصيد</p>
                        <p className={`text-[10px] font-black uppercase mt-1 px-2 py-0.5 rounded-md inline-block ${deposit.status === 'waiting' ? 'bg-amber-50 text-amber-600' :
                          deposit.status === 'approved' ? 'bg-green-50 text-green-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                          {deposit.status === 'waiting' ? 'قيد الانتظار' : deposit.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 text-lg">+{deposit.amount} <span className="text-xs">دينار</span></p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{parseDate(deposit.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'long' })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
