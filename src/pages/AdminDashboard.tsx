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
import { Plus, Trash2, Check, X, Loader2, Package, Wallet, ListTree, Users, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCatId, setNewServiceCatId] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceImg, setNewServiceImg] = useState('');

  useEffect(() => {
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

    setLoading(false);
    return () => { unsubCats(); unsubServices(); unsubOrders(); unsubDeposits(); };
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'categories'), { name: newCatName, icon: 'Gamepad2' });
    setNewCatName('');
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'services'), {
      name: newServiceName,
      price: parseFloat(newServicePrice),
      categoryId: newServiceCatId,
      description: newServiceDesc,
      imageUrl: newServiceImg
    });
    setNewServiceName(''); setNewServicePrice(''); setNewServiceDesc(''); setNewServiceImg('');
  };

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const chatCat = await addDoc(collection(db, 'categories'), { name: 'تطبيقات الدردشة الصوتية', icon: 'Mic2' });
      const gamesCat = await addDoc(collection(db, 'categories'), { name: 'الألعاب والترفيه', icon: 'Gamepad2' });

      const servicesToSeed = [
        {
          name: 'لاما شات - 1000 عملة',
          price: 10,
          categoryId: chatCat.id,
          description: 'شحن عملات تطبيق لاما شات - تسليم فوري',
          imageUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80'
        },
        {
          name: 'بيجو لايف - 500 ماسة',
          price: 15,
          categoryId: chatCat.id,
          description: 'شحن ماسات بيجو لايف - آمن وسريع',
          imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80'
        },
        {
          name: 'لاما لودو - باقة ذهبية',
          price: 20,
          categoryId: chatCat.id,
          description: 'شحن ذهب لاما لودو لرفع مستواك',
          imageUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=800&q=80'
        },
        {
          name: 'جواكر - 50,000 توكنز',
          price: 12,
          categoryId: gamesCat.id,
          description: 'شحن توكنز تطبيق جواكر لجميع الألعاب',
          imageUrl: 'https://images.unsplash.com/photo-1523875194681-bedd468c58bf?w=800&q=80'
        },
        {
          name: 'ببجي موبايل - 660 UC',
          price: 25,
          categoryId: gamesCat.id,
          description: 'شحن شدات ببجي موبايل - تسليم تلقائي',
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80'
        }
      ];

      for (const s of servicesToSeed) {
        await addDoc(collection(db, 'services'), { ...s, createdAt: serverTimestamp() });
      }
      alert('تم تهيئة البيانات بنجاح!');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تهيئة البيانات');
    }
    setLoading(false);
  };

  const handleApproveDeposit = async (deposit: Deposit) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', deposit.userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) throw new Error("User does not exist!");

        const currentBalance = userDoc.data().balance || 0;
        transaction.update(userRef, { balance: currentBalance + deposit.amount });
        transaction.update(doc(db, 'deposits', deposit.id), { status: 'approved' });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">لوحة التحكم</h1>
          <p className="text-slate-500 font-medium">مرحباً بك مجدداً، إليك نظرة على أداء المنصة.</p>
          <button 
            onClick={handleSeedData}
            className="btn-secondary text-xs py-2 px-4 w-fit"
          >
            تهيئة بيانات الشحن المتخصصة
          </button>
        </div>
        <div className="flex gap-4">
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
        </div>
      </header>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Management */}
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

        {/* Services Management */}
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
      </div>
    </div>
  );
};
