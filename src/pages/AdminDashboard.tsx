import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError } from '../App';
import { Category, Service, Order, Deposit, UserProfile } from '../types';
import { Plus, Trash2, Check, X, Loader2, Package, Wallet, ListTree, Users, ArrowUpRight, Search, BarChart3, TrendingUp, Calendar, Eye, LayoutDashboard, Settings, DollarSign, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, listUsers, getUser, UserDC } from '../services/dataconnect';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface DailyStats {
  id: string;
  visitors: number;
  date: string;
}

export const AdminDashboard: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [allUsers, setAllUsers] = useState<UserDC[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'finance' | 'users' | 'services'>('overview');

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCatId, setNewServiceCatId] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceImg, setNewServiceImg] = useState('');

  const [topupModal, setTopupModal] = useState<{ show: boolean; user: UserDC | null }>({ show: false, user: null });
  const [topupAmount, setTopupAmount] = useState('');
  const [isTopupLoading, setIsTopupLoading] = useState(false);

  const fetchData = async () => {
    try {
      const users = await listUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubCats = onSnapshot(collection(db, 'categories'), (s) => {
      setCategories(s.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (s) => {
      setServices(s.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'services');
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (s) => {
      setOrders(s.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    const unsubDeposits = onSnapshot(query(collection(db, 'deposits'), orderBy('createdAt', 'desc')), (s) => {
      setDeposits(s.docs.map(d => ({ id: d.id, ...d.data() } as Deposit)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'deposits');
    });

    const unsubStats = onSnapshot(query(collection(db, 'stats'), orderBy('date', 'desc')), (s) => {
      setDailyStats(s.docs.map(d => ({ id: d.id, ...d.data() } as DailyStats)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stats');
    });

    setLoading(false);
    return () => { unsubCats(); unsubServices(); unsubOrders(); unsubDeposits(); unsubStats(); };
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'categories'), { name: newCatName, icon: 'Gamepad2' });
      setNewCatName('');
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'services'), {
        name: newServiceName,
        price: parseFloat(newServicePrice),
        categoryId: newServiceCatId,
        description: newServiceDesc,
        imageUrl: newServiceImg,
        createdAt: serverTimestamp()
      });
      setNewServiceName(''); setNewServicePrice(''); setNewServiceDesc(''); setNewServiceImg(''); setNewServiceCatId('');
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const handleApproveDeposit = async (deposit: Deposit) => {
    try {
      // Always fetch fresh user data to ensure atomic-like balance update
      // Avoid using stale data from 'allUsers' state
      const dcUser = await getUser(deposit.userId);

      if (dcUser) {
        await updateBalance(deposit.userId, dcUser.balance + deposit.amount);
        // Update status in Firestore
        await updateDoc(doc(db, 'deposits', deposit.id), { status: 'approved' });
        fetchData(); // Refresh users list
      } else {
        console.error("User not found for deposit approval");
      }
    } catch (e) {
      console.error("Deposit approval failed: ", e);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    await updateDoc(doc(db, 'deposits', id), { status: 'rejected' });
  };

  const handleCompleteOrder = async (id: string) => {
    await updateDoc(doc(db, 'orders', id), { status: 'completed' });
  };

  const handleCancelOrder = async (id: string) => {
    await updateDoc(doc(db, 'orders', id), { status: 'cancelled' });
  };

  const handleManualTopup = async () => {
    if (!topupModal.user || !topupAmount || isNaN(parseFloat(topupAmount))) return;

    setIsTopupLoading(true);
    try {
      await updateBalance(topupModal.user.id, topupModal.user.balance + parseFloat(topupAmount));
      await fetchData();
      setTopupModal({ show: false, user: null });
      setTopupAmount('');
      alert('تم شحن الرصيد بنجاح!');
    } catch (error) {
      console.error('Manual topup failed:', error);
      alert('حدث خطأ أثناء الشحن');
    } finally {
      setIsTopupLoading(false);
    }
  };

  const parseDate = (date: any) => {
    if (!date) return new Date(0);
    if (typeof date === 'string') return new Date(date);
    if (date.toDate) return date.toDate();
    return new Date(date);
  };

  const financials = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const filterByDate = (items: any[], dateLimit: Date) => {
      return items.filter(item => parseDate(item.createdAt) >= dateLimit);
    };

    const completedOrders = orders.filter(o => o.status === 'completed');
    const approvedDeposits = deposits.filter(d => d.status === 'approved');

    const sumAmount = (items: any[]) => items.reduce((sum, item) => sum + (item.amount || item.price || 0), 0);

    const isToday = (date: any) => {
      const d = parseDate(date);
      return d.toISOString().split('T')[0] === todayStr;
    };

    return {
      daily: {
        revenue: sumAmount(completedOrders.filter(o => isToday(o.createdAt))),
        deposits: sumAmount(approvedDeposits.filter(d => isToday(d.createdAt))),
        visitors: dailyStats.find(s => s.date === todayStr)?.visitors || 0
      },
      weekly: {
        revenue: sumAmount(filterByDate(completedOrders, oneWeekAgo)),
        deposits: sumAmount(filterByDate(approvedDeposits, oneWeekAgo)),
        visitors: dailyStats.filter(s => new Date(s.date) >= oneWeekAgo).reduce((sum, s) => sum + s.visitors, 0)
      },
      monthly: {
        revenue: sumAmount(filterByDate(completedOrders, oneMonthAgo)),
        deposits: sumAmount(filterByDate(approvedDeposits, oneMonthAgo)),
        visitors: dailyStats.filter(s => new Date(s.date) >= oneMonthAgo).reduce((sum, s) => sum + s.visitors, 0)
      }
    };
  }, [orders, deposits, dailyStats]);

  const reportConfig = {
    daily: { title: 'تقارير اليوم', icon: Calendar, bg: 'bg-blue-100', text: 'text-blue-600' },
    weekly: { title: 'تقارير الأسبوع', icon: TrendingUp, bg: 'bg-violet-100', text: 'text-violet-600' },
    monthly: { title: 'تقارير الشهر', icon: BarChart3, bg: 'bg-primary/10', text: 'text-primary' }
  };

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
    { id: 'finance', label: 'المالية', icon: DollarSign },
    { id: 'users', label: 'المستخدمين', icon: Users },
    { id: 'services', label: 'الخدمات', icon: ListTree },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 -m-4 p-4 lg:p-8 space-y-8">
      {/* Top Header & Navigation */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-4 z-40 rounded-[2rem] shadow-sm border border-slate-200/60 p-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-primary to-violet-600 rounded-2xl shadow-lg shadow-primary/20 text-white">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">لوحة التحكم</h1>
              <p className="text-xs text-slate-500 font-bold">إدارة شاملة للمنصة</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <AnimatePresence mode='wait'>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >

          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/10" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Package className="w-6 h-6" /></div>
                    <span className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">LIVE</span>
                  </div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">الطلبات المعلقة</p>
                  <h3 className="text-3xl font-black text-slate-900">{orders.filter(o => o.status === 'pending').length}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-amber-500/10" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600"><Wallet className="w-6 h-6" /></div>
                    {deposits.filter(d => d.status === 'waiting').length > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                  </div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">طلبات الشحن</p>
                  <h3 className="text-3xl font-black text-slate-900">{deposits.filter(d => d.status === 'waiting').length}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/10" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><Eye className="w-6 h-6" /></div>
                  </div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">زوار اليوم</p>
                  <h3 className="text-3xl font-black text-slate-900">{financials.daily.visitors}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl shadow-slate-900/20 text-white relative overflow-hidden">
                  <div className="absolute left-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -ml-10 -mb-10" />
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><DollarSign className="w-6 h-6" /></div>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">مبيعات اليوم</p>
                  <h3 className="text-3xl font-black">{financials.daily.revenue.toFixed(2)} <span className="text-sm opacity-50 font-medium">د.أ</span></h3>
                </motion.div>
              </div>

              {/* 7-Day Summary */}
              <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center gap-4">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><BarChart3 className="w-6 h-6" /></div>
                  <div>
                    <h2 className="font-black text-slate-900 text-lg">ملخص الأداء الأسبوعي</h2>
                    <p className="text-xs text-slate-500 font-bold">إحصائيات آخر 7 أيام</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5">التاريخ</th>
                        <th className="px-8 py-5">الزوار</th>
                        <th className="px-8 py-5">المبيعات</th>
                        <th className="px-8 py-5">الإيداعات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailyStats.slice(0, 7).map(stat => {
                        const dayOrders = orders.filter(o => o.status === 'completed' && parseDate(o.createdAt).toISOString().startsWith(stat.date));
                        const dayDeposits = deposits.filter(d => d.status === 'approved' && parseDate(d.createdAt).toISOString().startsWith(stat.date));
                        const revenue = dayOrders.reduce((sum, o) => sum + o.amount, 0);
                        const depositSum = dayDeposits.reduce((sum, d) => sum + d.amount, 0);

                        return (
                          <tr key={stat.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-700">{stat.date}</td>
                            <td className="px-8 py-5 text-indigo-600 font-black">{stat.visitors}</td>
                            <td className="px-8 py-5 text-slate-900 font-black">{revenue.toFixed(2)} د.أ</td>
                            <td className="px-8 py-5 text-emerald-600 font-black">{depositSum.toFixed(2)} د.أ</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ================= ORDERS TAB ================= */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><ShoppingBag className="w-5 h-5" /></div>
                  إدارة الطلبات
                </h2>
                <span className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-black text-slate-500">{orders.length} طلب</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">الخدمة</th>
                      <th className="px-6 py-4">المستخدم</th>
                      <th className="px-6 py-4">المعرف (ID)</th>
                      <th className="px-6 py-4">السعر</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.length === 0 ? (
                      <tr><td colSpan={6} className="p-12 text-center text-slate-400">لا توجد طلبات حتى الآن</td></tr>
                    ) : orders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{order.serviceName}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{order.userEmail}</td>
                        <td className="px-6 py-4 font-mono text-primary font-bold bg-primary/5 w-fit rounded-lg px-2">{order.playerAppId}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{order.amount} د.أ</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                            order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغى' : 'قيد الانتظار'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {order.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleCompleteOrder(order.id)} className="p-2 bg-green-100 text-green-600 rounded-xl hover:scale-105 transition-transform"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleCancelOrder(order.id)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:scale-105 transition-transform"><X className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= FINANCE TAB ================= */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* Reports Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Object.keys(reportConfig) as Array<keyof typeof reportConfig>).map((key, idx) => {
                  const config = reportConfig[key];
                  const data = financials[key];
                  const Icon = config.icon;
                  return (
                    <div key={key} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className={`p-2 ${config.bg} rounded-xl`}><Icon className={`w-5 h-5 ${config.text}`} /></div>
                        <h3 className="font-black text-slate-900">{config.title}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">إجمالي المبيعات</span>
                          <span className="font-black text-slate-900">{data.revenue.toFixed(2)} د.أ</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">إجمالي الإيداعات</span>
                          <span className="font-black text-emerald-600">{data.deposits.toFixed(2)} د.أ</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deposits Table */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center gap-4">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Wallet className="w-5 h-5" /></div>
                  <h2 className="font-black text-slate-900 text-lg">طلبات الشحن الواردة</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">المبلغ</th>
                        <th className="px-6 py-4">المستخدم</th>
                        <th className="px-6 py-4">التاريخ</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deposits.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400">لا توجد طلبات شحن</td></tr>
                      ) : deposits.map(deposit => (
                        <tr key={deposit.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-black text-emerald-600">+{deposit.amount} د.أ</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{deposit.userEmail}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{new Date(deposit.createdAt).toLocaleDateString('ar-JO')}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${deposit.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                              deposit.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                              {deposit.status === 'approved' ? 'موافق عليه' : deposit.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {deposit.status === 'waiting' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveDeposit(deposit)} className="p-2 bg-green-100 text-green-600 rounded-xl hover:scale-105 transition-transform"><Check className="w-4 h-4" /></button>
                                <button onClick={() => handleRejectDeposit(deposit.id)} className="p-2 bg-red-100 text-red-600 rounded-xl hover:scale-105 transition-transform"><X className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= USERS TAB ================= */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Users className="w-5 h-5" /></div>
                  قاعدة بيانات المستخدمين
                </h2>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث سريع..."
                    className="pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 w-64"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">المستخدم</th>
                      <th className="px-6 py-4">البريد الإلكتروني</th>
                      <th className="px-6 py-4">المحفظة</th>
                      <th className="px-6 py-4">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allUsers.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">{user.username.charAt(0).toUpperCase()}</div>
                            <p className="font-black text-slate-900">{user.username}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{user.email}</td>
                        <td className="px-6 py-4"><span className="font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{user.balance.toFixed(2)} دينار</span></td>
                        <td className="px-6 py-4">
                          <button onClick={() => setTopupModal({ show: true, user })} className="text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors border border-primary/20">
                            + شحن رصيد
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= SERVICES TAB ================= */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Categories */}
              <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                  <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><ListTree className="w-5 h-5" /></div>
                  <h3 className="font-black text-slate-900">الأصناف الحالية</h3>
                </div>
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input required type="text" placeholder="اسم الصنف..." className="flex-grow px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary/20" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                  <button className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 transition-colors"><Plus className="w-5 h-5" /></button>
                </form>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                      <button onClick={() => deleteDoc(doc(db, 'categories', cat.id))} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Service */}
              <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl"><Plus className="w-5 h-5" /></div>
                  <h3 className="font-black text-slate-900">إضافة خدمة جديدة</h3>
                </div>
                <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">اسم الخدمة</label>
                    <input required type="text" placeholder="مثال: 60 شدة" className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-primary/20" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">السعر (دينار)</label>
                    <input required type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-primary/20" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">الصنف</label>
                    <select required className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-primary/20" value={newServiceCatId} onChange={e => setNewServiceCatId(e.target.value)}>
                      <option value="">اختر...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">رابط الصورة</label>
                    <input type="text" placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-primary/20" value={newServiceImg} onChange={e => setNewServiceImg(e.target.value)} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">الوصف</label>
                    <textarea className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none" value={newServiceDesc} onChange={e => setNewServiceDesc(e.target.value)} />
                  </div>
                  <button className="md:col-span-2 bg-primary text-white py-4 rounded-xl font-black text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">نشر الخدمة</button>
                </form>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Top-up Modal */}
      <AnimatePresence>
        {topupModal.show && topupModal.user && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isTopupLoading && setTopupModal({ show: false, user: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">شحن رصيد يدوي</h3>
                <p className="text-slate-500 font-medium">أنت الآن تقوم بشحن رصيد للمستخدم: <span className="text-primary font-bold">{topupModal.user.username}</span></p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الرصيد الحالي</p>
                <p className="text-2xl font-black text-slate-900">{topupModal.user.balance.toFixed(2)} دينار</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المبلغ المراد إضافته</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-lg"
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">دينار</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleManualTopup}
                    disabled={!topupAmount || isTopupLoading}
                    className="flex-1 btn-primary py-4 rounded-2xl disabled:opacity-50"
                  >
                    {isTopupLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الشحن'}
                  </button>
                  <button
                    onClick={() => setTopupModal({ show: false, user: null })}
                    disabled={isTopupLoading}
                    className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
