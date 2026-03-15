import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError } from '../App';
import { Service, Category, Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, CheckCircle2, XCircle, AlertCircle, Zap, ChevronLeft, ChevronRight, TrendingUp, Clock, Loader2, ListTree, ArrowUpRight } from 'lucide-react';
import { sendOrderNotificationToWhatsApp } from '../services/whatsapp';
import { updateBalance, createTransaction, getUser as getDCUser } from '../services/dataconnect';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const Home: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderModal, setOrderModal] = useState<{ show: boolean; service: Service | null }>({ show: false, service: null });
  const [playerAppId, setPlayerAppId] = useState('');
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error' | 'processing' | null; message: string }>({ type: null, message: '' });
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    const unsubServices = onSnapshot(query(collection(db, 'services'), orderBy('createdAt', 'desc')), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'services'));

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('name', 'asc')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'categories'));

    return () => {
      unsubServices();
      unsubCategories();
    };
  }, []);

  const handleOrder = async () => {
    if (!user || !profile || !orderModal.service || !playerAppId) return;

    setOrderStatus({ type: 'processing', message: 'جاري معالجة الطلب...' });
    try {
      // Fetch latest balance from Data Connect
      const dcUser = await getDCUser(user.uid);
      if (!dcUser) throw new Error('لم يتم العثور على ملف المستخدم في قاعدة البيانات');

      const currentBalance = dcUser.balance;
      const isAdmin = profile?.role === 'admin';
      const price = orderModal.service.price;

      if (!isAdmin && currentBalance < price) {
        throw new Error('رصيدك غير كافٍ. يرجى شحن محفظتك.');
      }

      // Deduct balance if not admin
      if (!isAdmin) {
        await updateBalance(user.uid, currentBalance - price);
      }

      // Create transaction record in Data Connect
      await createTransaction(
        user.uid,
        price,
        'purchase',
        'completed'
      );

      // Also keep Firestore order for admin dashboard (if needed)
      const orderData: Omit<Order, 'id'> = {
        userId: user.uid,
        userEmail: user.email!,
        serviceId: orderModal.service!.id,
        serviceName: orderModal.service!.name,
        amount: price,
        playerAppId,
        status: 'pending',
        createdAt: serverTimestamp() as any
      };

      const ordersRef = collection(db, 'orders');
      await setDoc(doc(ordersRef), orderData);

      sendOrderNotificationToWhatsApp(orderModal.service.name, playerAppId, user.email!);
      
      // Refresh local profile balance
      await refreshProfile();
      setOrderStatus({ type: 'success', message: 'تم تقديم الطلب! سيتم تنفيذه قريباً.' });
      setTimeout(() => {
        setOrderModal({ show: false, service: null });
        setOrderStatus({ type: null, message: '' });
        setPlayerAppId('');
      }, 3000);
    } catch (error: any) {
      setOrderStatus({ type: 'error', message: error.message || 'حدث خطأ أثناء تنفيذ الطلب.' });
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.categoryId === selectedCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredServices = services.slice(0, 6);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      {/* Sidebar - Categories & Info */}
      <aside className="lg:w-80 shrink-0 space-y-6">
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/50 sticky top-24 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <ListTree className="w-6 h-6 text-primary" />
              الأصناف
            </h3>
            
            {/* Search Bar in Sidebar */}
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-xs"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              <button 
                onClick={() => setSelectedCategory('all')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                  selectedCategory === 'all' 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span>الكل</span>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                    selectedCategory === cat.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span>{cat.name}</span>
                  <ArrowUpRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 space-y-6">
            <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">تحتاج مساعدة؟</p>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">فريق الدعم الفني متاح دائماً لمساعدتك في عمليات الشحن.</p>
              <a 
                href="https://wa.me/962781254771" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 rounded-xl text-primary font-black text-xs hover:bg-primary hover:text-white transition-all"
              >
                تواصل معنا عبر واتساب
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow space-y-12">
        {/* Hero Section */}
        <section className="relative h-[450px] rounded-[3.5rem] overflow-hidden group shadow-2xl shadow-primary/10">
          <img 
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&q=80" 
            alt="Hero" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl space-y-6"
            >
              <div className="flex items-center gap-3">
                <span className="bg-primary px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest">عرض خاص</span>
                <span className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest">آمن 100%</span>
              </div>
              <h1 className="text-6xl font-black text-white leading-[1.1] tracking-tighter">
                اشحن ألعابك المفضلة <br />
                <span className="text-primary italic">بأفضل الأسعار</span>
              </h1>
              <p className="text-white/70 font-medium text-lg leading-relaxed">
                نشامى بلس هي المنصة الأسرع والأكثر أماناً لشحن شدات ببجي، جواكر، لاما شات، والعديد من الخدمات الرقمية الأخرى في الأردن.
              </p>
              <button 
                onClick={() => {
                  const el = document.getElementById('services');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-primary w-fit px-10 py-4 text-lg"
              >
                ابدأ الشحن الآن
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6" id="services">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4">
              <Zap className="w-10 h-10 text-primary" />
              الخدمات المتاحة
            </h2>
            <p className="text-slate-500 font-medium text-lg">اختر الخدمة التي تريد شحنها الآن</p>
          </div>
          
          <div className="relative w-full md:w-96 group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="ابحث عن خدمة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-14 pl-6 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-sm shadow-sm"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredServices.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-500 font-black text-xl">لم يتم العثور على خدمات تطابق بحثك</p>
            </div>
          ) : (
            filteredServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -12 }}
                className="glass-card group rounded-[3rem] overflow-hidden border border-white/50 hover:border-primary/30 transition-all duration-500 flex flex-col h-full"
              >
                <div className="aspect-[16/11] overflow-hidden relative">
                  <img 
                    src={service.imageUrl || `https://picsum.photos/seed/${service.name}/800/550`} 
                    alt={service.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 right-6">
                    <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl text-base font-black text-primary shadow-2xl border border-white">
                      {service.price} دينار
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="p-8 space-y-6 flex flex-grow flex-col">
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
                      {categories.find(c => c.id === service.categoryId)?.name || 'خدمة'}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">
                      {service.name}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-6">
                    <button 
                      onClick={() => setOrderModal({ show: true, service })}
                      className="w-full py-5 bg-slate-50 group-hover:bg-primary group-hover:text-white group-hover:shadow-xl group-hover:shadow-primary/30 rounded-[1.5rem] text-sm font-black text-slate-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      اطلب الآن
                      <ArrowUpRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {orderModal.show && orderModal.service && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => orderStatus.type !== 'processing' && setOrderModal({ show: false, service: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={orderModal.service.imageUrl || `https://picsum.photos/seed/${orderModal.service.name}/200/200`} alt={orderModal.service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900">{orderModal.service.name}</h3>
                    <p className="text-primary font-black text-lg">{orderModal.service.price} دينار</p>
                  </div>
                </div>

                {orderStatus.type && orderStatus.type !== 'processing' ? (
                  <div className={`p-6 rounded-2xl flex flex-col items-center text-center gap-3 ${
                    orderStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {orderStatus.type === 'success' ? (
                      <CheckCircle2 className="w-12 h-12" />
                    ) : (
                      <XCircle className="w-12 h-12" />
                    )}
                    <p className="font-bold">{orderStatus.message}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">معرف اللاعب / رقم الحساب</label>
                      <input
                        type="text"
                        value={playerAppId}
                        onChange={(e) => setPlayerAppId(e.target.value)}
                        placeholder="أدخل المعرف هنا..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-right font-bold"
                      />
                    </div>

                    {!user ? (
                      <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 font-medium">
                          يرجى تسجيل الدخول لتتمكن من إتمام الطلب.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-bold">رصيدك الحالي:</span>
                          <span className="font-black text-slate-900">{profile?.balance.toFixed(2)} دينار</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleOrder}
                        disabled={!user || !playerAppId || orderStatus.type === 'processing'}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {orderStatus.type === 'processing' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            تأكيد الطلب
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setOrderModal({ show: false, service: null })}
                        disabled={orderStatus.type === 'processing'}
                        className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
