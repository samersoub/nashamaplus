import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError } from '../App';
import { Category, Service, Order, Deposit, UserProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
import { Plus, Trash2, Check, X, Loader2, Package, Wallet, ListTree, Users, ArrowUpRight, Search, BarChart3, TrendingUp, Calendar, Eye, Shield, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, listUsers, UserDC } from '../services/dataconnect';

interface DailyStats {
  id: string;
  visitors: number;
  date: string;
}

export const AdminDashboard: React.FC = () => {
  const { isAdmin, isModerator } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [allUsers, setAllUsers] = useState<UserDC[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCatId, setNewServiceCatId] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceImg, setNewServiceImg] = useState('');

  const [topupModal, setTopupModal] = useState<{ show: boolean; user: UserDC | null }>({ show: false, user: null });
  const [editServiceModal, setEditServiceModal] = useState<{ show: boolean; service: Service | null }>({ show: false, service: null });
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
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => {
      setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as UserDC)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

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
    return () => { unsubUsers(); unsubCats(); unsubServices(); unsubOrders(); unsubDeposits(); unsubStats(); };
  }, []);

  const handleSeedData = async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      // Add default categories
      const defaultCats = [
        { name: 'ببجي موبايل', icon: 'Gamepad2' },
        { name: 'جواكر', icon: 'Cards' },
        { name: 'لاما شات', icon: 'MessageCircle' }
      ];

      for (const cat of defaultCats) {
        await addDoc(categoriesRef, cat);
      }

      alert('تمت إضافة البيانات التجريبية بنجاح!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('حدث خطأ أثناء إضافة البيانات');
    }
  };

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
        isAvailable: true,
        createdAt: serverTimestamp()
      });
      setNewServiceName(''); setNewServicePrice(''); setNewServiceDesc(''); setNewServiceImg('');
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editServiceModal.service) return;
    try {
      await updateDoc(doc(db, 'services', editServiceModal.service.id), {
        name: editServiceModal.service.name,
        price: editServiceModal.service.price,
        description: editServiceModal.service.description,
        imageUrl: editServiceModal.service.imageUrl,
        categoryId: editServiceModal.service.categoryId
      });
      setEditServiceModal({ show: false, service: null });
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const handleToggleAvailability = async (service: Service) => {
    try {
      await updateDoc(doc(db, 'services', service.id), {
        isAvailable: !service.isAvailable
      });
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  const handleUpdateRole = async (user: UserDC, newRole: 'user' | 'moderator' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', user.id), { role: newRole });
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleApproveDeposit = async (deposit: Deposit) => {
    try {
      // Update balance in Data Connect
      const user = allUsers.find(u => u.id === deposit.userId);
      if (user) {
        await updateBalance(deposit.userId, user.balance + deposit.amount);
      } else {
        // Fallback if user not in list
        const { getUser } = await import('../services/dataconnect');
        const dcUser = await getUser(deposit.userId);
        if (dcUser) {
          await updateBalance(deposit.userId, dcUser.balance + deposit.amount);
        }
      }
      
      // Update status in Firestore
      await updateDoc(doc(db, 'deposits', deposit.id), { status: 'approved' });
      fetchData(); // Refresh users list
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

  const calculateFinancials = () => {
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
  };

  const financials = calculateFinancials();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">لوحة التحكم</h1>
          <p className="text-slate-500 font-medium">مرحباً بك مجدداً، إليك نظرة على أداء المنصة.</p>
          <div className="flex gap-2">
            <button 
              onClick={handleSeedData}
              className="btn-secondary text-xs py-2 px-4 w-fit"
            >
              تهيئة بيانات الشحن
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-4"
          >
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">الطلبات المعلقة</p>
              <p className="text-2xl font-black text-slate-900">{orders.filter(o => o.status === 'pending').length}</p>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-4"
          >
            <div className="p-3 bg-amber-100 rounded-2xl">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">طلبات الشحن</p>
              <p className="text-2xl font-black text-slate-900">{deposits.filter(d => d.status === 'waiting').length}</p>
            </div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-4"
          >
            <div className="p-3 bg-emerald-100 rounded-2xl">
              <Eye className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">زوار اليوم</p>
              <p className="text-2xl font-black text-slate-900">{financials.daily.visitors}</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Financial Reports Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'تقارير اليوم', data: financials.daily, icon: Calendar, color: 'blue' },
          { title: 'تقارير الأسبوع', data: financials.weekly, icon: TrendingUp, color: 'indigo' },
          { title: 'تقارير الشهر', data: financials.monthly, icon: BarChart3, color: 'violet' }
        ].map((report, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-8 rounded-[2.5rem] border border-white/50 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${report.color}-100 rounded-xl`}>
                <report.icon className={`w-5 h-5 text-${report.color}-600`} />
              </div>
              <h3 className="font-black text-slate-900">{report.title}</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">إجمالي المبيعات</span>
                <span className="font-black text-slate-900">{report.data.revenue.toFixed(2)} د.أ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">إجمالي الإيداعات</span>
                <span className="font-black text-emerald-600">{report.data.deposits.toFixed(2)} د.أ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">إجمالي الزوار</span>
                <span className="font-black text-indigo-600">{report.data.visitors}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* 7-Day Financial Summary */}
      <section className="glass-card rounded-[2.5rem] overflow-hidden border border-white/50">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">ملخص آخر 7 أيام</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">التاريخ</th>
                <th className="px-8 py-4">الزوار</th>
                <th className="px-8 py-4">المبيعات</th>
                <th className="px-8 py-4">الإيداعات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyStats.slice(0, 7).map(stat => {
                const dayOrders = orders.filter(o => o.status === 'completed' && parseDate(o.createdAt).toISOString().startsWith(stat.date));
                const dayDeposits = deposits.filter(d => d.status === 'approved' && parseDate(d.createdAt).toISOString().startsWith(stat.date));
                const revenue = dayOrders.reduce((sum, o) => sum + o.amount, 0);
                const depositSum = dayDeposits.reduce((sum, d) => sum + d.amount, 0);

                return (
                  <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-700">{stat.date}</td>
                    <td className="px-8 py-4 text-indigo-600 font-black">{stat.visitors}</td>
                    <td className="px-8 py-4 text-slate-900 font-black">{revenue.toFixed(2)} د.أ</td>
                    <td className="px-8 py-4 text-emerald-600 font-black">{depositSum.toFixed(2)} د.أ</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Orders Management */}
        <section className="glass-card rounded-[2.5rem] overflow-hidden border border-white/50">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-black text-slate-900 text-lg">الطلبات الأخيرة</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-medium">لا توجد طلبات.</div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="space-y-1">
                    <p className="font-black text-slate-900">{order.serviceName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">ID:</span>
                      <p className="text-xs font-mono text-primary font-bold">{order.playerAppId}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 truncate max-w-[150px]">{order.userId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCompleteOrder(order.id)} 
                          className="p-3 bg-green-100 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="اعتماد"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleCancelOrder(order.id)} 
                          className="p-3 bg-red-100 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="إلغاء"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${
                        order.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {order.status === 'completed' ? 'مكتمل' : 'ملغى'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Deposits Management */}
        <section className="glass-card rounded-[2.5rem] overflow-hidden border border-white/50">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="font-black text-slate-900 text-lg">طلبات الشحن</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {deposits.length === 0 ? (
              <div className="p-20 text-center text-slate-400 font-medium">لا توجد طلبات شحن.</div>
            ) : (
              deposits.map(deposit => (
                <div key={deposit.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 text-lg">+{deposit.amount}</p>
                      <span className="text-xs font-bold text-slate-400">دينار</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500">{deposit.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {deposit.status === 'waiting' ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveDeposit(deposit)} 
                          className="p-3 bg-green-100 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="موافقة"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleRejectDeposit(deposit.id)} 
                          className="p-3 bg-red-100 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                          title="رفض"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${
                        deposit.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {deposit.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* User Management Section */}
      {isAdmin && (
        <section className="glass-card rounded-[2.5rem] overflow-hidden border border-white/50">
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/30 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">إدارة الأعضاء</h2>
          </div>
          <div className="relative w-full md:w-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="بحث عن عضو..." 
              className="w-full md:w-64 pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {allUsers.filter(u => (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase())).map(user => (
            <div key={user.id} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-slate-900">{user.username}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{user.id}</p>
                  <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-black text-primary">{user.balance.toFixed(2)} د.أ</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                    user.role === 'admin' ? 'bg-amber-100 text-amber-600' : 
                    user.role === 'moderator' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {user.role === 'admin' ? 'مسؤول' : user.role === 'moderator' ? 'مشرف' : 'عضو'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTopupModal({ show: true, user })}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl text-xs font-black transition-all"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  شحن رصيد
                </button>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleUpdateRole(user, 'user')}
                    className={`p-3 rounded-xl transition-all ${user.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-slate-50 text-slate-400'}`}
                    title="عضو"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleUpdateRole(user, 'moderator')}
                    className={`p-3 rounded-xl transition-all ${user.role === 'moderator' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}
                    title="مشرف"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleUpdateRole(user, 'admin')}
                    className={`p-3 rounded-xl transition-all ${user.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}
                    title="مسؤول"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">المستخدم</th>
                <th className="px-8 py-4">البريد الإلكتروني</th>
                <th className="px-8 py-4">الرصيد</th>
                <th className="px-8 py-4">الرتبة</th>
                <th className="px-8 py-4 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allUsers.filter(u => (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="font-black text-slate-900">{user.username}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{user.id}</p>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-600">{user.email}</td>
                  <td className="px-8 py-4">
                    <span className="font-black text-primary">{user.balance.toFixed(2)} دينار</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${
                      user.role === 'admin' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 
                      user.role === 'moderator' ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' :
                      'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {user.role === 'admin' ? 'مسؤول' : user.role === 'moderator' ? 'مشرف' : 'عضو'}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => handleUpdateRole(user, 'user')}
                          className={`p-2 rounded-xl transition-all ${user.role === 'user' ? 'bg-white shadow-sm text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                          title="عضو"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateRole(user, 'moderator')}
                          className={`p-2 rounded-xl transition-all ${user.role === 'moderator' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                          title="مشرف"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateRole(user, 'admin')}
                          className={`p-2 rounded-xl transition-all ${user.role === 'admin' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400 hover:text-amber-600'}`}
                          title="مسؤول"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => setTopupModal({ show: true, user })}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black hover:bg-primary hover:text-white transition-all"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        شحن رصيد
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Management */}
        {isAdmin && (
          <section className="glass-card p-8 rounded-[2.5rem] space-y-8 border border-white/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ListTree className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">إدارة الأصناف</h2>
          </div>
          
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <input 
              required 
              type="text" 
              placeholder="اسم الصنف الجديد..." 
              className="flex-grow px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
            />
            <button className="btn-primary p-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-transform">
              <Plus className="w-6 h-6" />
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <motion.div 
                key={cat.id} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 group hover:border-primary/30 transition-all"
              >
                <span className="font-bold text-slate-700">{cat.name}</span>
                <button 
                  onClick={() => deleteDoc(doc(db, 'categories', cat.id))} 
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

        {/* Services Management */}
        {isAdmin && (
          <section className="glass-card p-8 rounded-[2.5rem] space-y-8 border border-white/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">إضافة خدمة جديدة</h2>
          </div>

          <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">اسم الخدمة</label>
              <input required type="text" placeholder="مثال: 60 شدة ببجي" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">السعر (دينار)</label>
              <input required type="number" step="0.01" placeholder="0.00" className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">الصنف</label>
              <select required className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold appearance-none" value={newServiceCatId} onChange={e => setNewServiceCatId(e.target.value)}>
                <option value="">اختر الصنف...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">رابط الصورة</label>
              <input type="text" placeholder="https://..." className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" value={newServiceImg} onChange={e => setNewServiceImg(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">الوصف</label>
              <textarea placeholder="تفاصيل الخدمة..." className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold h-28 resize-none" value={newServiceDesc} onChange={e => setNewServiceDesc(e.target.value)} />
            </div>

            <button className="md:col-span-2 btn-primary py-5 rounded-2xl font-black text-lg shadow-xl shadow-primary/25 active:scale-95 transition-transform">
              حفظ الخدمة ونشرها
            </button>
          </form>
        </section>
      )}

        {/* Existing Services List */}
        <section className="glass-card p-8 rounded-[2.5rem] space-y-8 border border-white/50 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-black text-slate-900 text-lg">إدارة الخدمات الحالية</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map(service => (
              <div key={service.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-50">
                  <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">{service.name}</h3>
                  <p className="text-primary font-bold">{service.price} د.أ</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditServiceModal({ show: true, service })}
                    className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    تعديل
                  </button>
                  <button 
                    onClick={() => handleToggleAvailability(service)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      service.isAvailable !== false 
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {service.isAvailable !== false ? 'متوفر' : 'غير متوفر'}
                  </button>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'services', service.id))}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

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

      {/* Edit Service Modal */}
      <AnimatePresence>
        {editServiceModal.show && editServiceModal.service && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditServiceModal({ show: false, service: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">تعديل الخدمة</h3>
                <p className="text-slate-500 font-medium">تعديل بيانات الخدمة: <span className="text-primary font-bold">{editServiceModal.service.name}</span></p>
              </div>

              <form onSubmit={handleUpdateService} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">اسم الخدمة</label>
                  <input required type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" value={editServiceModal.service.name} onChange={e => setEditServiceModal({ ...editServiceModal, service: { ...editServiceModal.service!, name: e.target.value } })} />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">السعر (دينار)</label>
                  <input required type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" value={editServiceModal.service.price} onChange={e => setEditServiceModal({ ...editServiceModal, service: { ...editServiceModal.service!, price: parseFloat(e.target.value) } })} />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">الصنف</label>
                  <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold appearance-none" value={editServiceModal.service.categoryId} onChange={e => setEditServiceModal({ ...editServiceModal, service: { ...editServiceModal.service!, categoryId: e.target.value } })}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">رابط الصورة</label>
                  <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold" value={editServiceModal.service.imageUrl} onChange={e => setEditServiceModal({ ...editServiceModal, service: { ...editServiceModal.service!, imageUrl: e.target.value } })} />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">الوصف</label>
                  <textarea className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold h-28 resize-none" value={editServiceModal.service.description} onChange={e => setEditServiceModal({ ...editServiceModal, service: { ...editServiceModal.service!, description: e.target.value } })} />
                </div>

                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="flex-1 btn-primary py-4 rounded-2xl">حفظ التغييرات</button>
                  <button type="button" onClick={() => setEditServiceModal({ show: false, service: null })} className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
