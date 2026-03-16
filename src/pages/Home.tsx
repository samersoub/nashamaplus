import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError } from '../App';
import { Service, Category, Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, CheckCircle2, XCircle, AlertCircle, Zap, ChevronLeft, ChevronRight, TrendingUp, Clock, Loader2, ListTree, ArrowUpRight, MessageCircle } from 'lucide-react';
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

import { useSearchParams } from 'react-router-dom';

export const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val) {
      setSearchParams({ search: val });
    } else {
      setSearchParams({});
    }
  };
  const [orderModal, setOrderModal] = useState<{ show: boolean; service: Service | null }>({ show: false, service: null });
  const [playerAppId, setPlayerAppId] = useState('');
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error' | 'processing' | null; message: string }>({ type: null, message: '' });
  const { user, profile } = useAuth();

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
    const matchesSearch = (service.name || '').toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="space-y-12 pb-20">
      {/* Hero Section - Modern & Immersive */}
      <section className="relative h-[450px] lg:h-[550px] rounded-[2.5rem] lg:rounded-[3.5rem] overflow-hidden group shadow-2xl shadow-primary/10">
        <img 
          src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&q=80" 
          alt="Hero" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl space-y-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-primary/20 backdrop-blur-md border border-primary/30 px-4 py-1.5 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">عرض خاص</span>
              <span className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest">تسليم فوري</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.1] tracking-tighter">
              اشحن ألعابك المفضلة <br />
              <span className="text-primary italic">بأفضل الأسعار</span>
            </h1>
            <p className="text-white/70 font-medium text-base lg:text-lg leading-relaxed max-w-lg">
              نشامى بلس هي وجهتك الأولى في الأردن لشحن شدات ببجي، جواهر فري فاير، وبطاقات الهدايا العالمية.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => {
                  const el = document.getElementById('categories');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/25 active:scale-95"
              >
                ابدأ الشحن الآن
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <a 
                href="https://wa.me/962781254771"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 active:scale-95"
              >
                تواصل معنا
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories Grid - Circular Icons */}
      <section id="categories" className="space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <h2 className="text-2xl lg:text-3xl font-black text-slate-900">الأصناف المميزة</h2>
          <div className="w-12 h-1 bg-primary rounded-full" />
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-8">
          <button 
            onClick={() => setSelectedCategory('all')}
            className="group flex flex-col items-center gap-4"
          >
            <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              selectedCategory === 'all' 
              ? 'bg-primary shadow-xl shadow-primary/30 scale-110' 
              : 'bg-white border border-slate-100 hover:border-primary/30 hover:shadow-lg'
            }`}>
              <Zap className={`w-8 h-8 lg:w-10 lg:h-10 ${selectedCategory === 'all' ? 'text-white' : 'text-primary'}`} />
            </div>
            <span className={`font-black text-xs lg:text-sm transition-colors ${selectedCategory === 'all' ? 'text-primary' : 'text-slate-600'}`}>الكل</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                const el = document.getElementById('services');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group flex flex-col items-center gap-4"
            >
              <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden transition-all duration-300 ${
                selectedCategory === cat.id 
                ? 'ring-4 ring-primary ring-offset-4 scale-110 shadow-xl shadow-primary/20' 
                : 'bg-white border border-slate-100 hover:border-primary/30 hover:shadow-lg'
              }`}>
                <img 
                  src={cat.icon || `https://picsum.photos/seed/${cat.name}/200/200`} 
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className={`font-black text-xs lg:text-sm transition-colors ${selectedCategory === cat.id ? 'text-primary' : 'text-slate-600'}`}>{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-col lg:flex-row gap-12" id="services">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">الأصناف</h3>
              <div className="space-y-1">
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                    selectedCategory === 'all' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>الكل</span>
                  <Zap className="w-4 h-4 opacity-50" />
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-sm ${
                      selectedCategory === cat.id 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <ChevronLeft className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h4 className="font-black text-lg leading-tight">الأكثر طلباً اليوم</h4>
              <p className="text-xs text-white/60 font-medium leading-relaxed">شدات ببجي موبايل وجواهر فري فاير تتصدر القائمة.</p>
            </div>
          </div>
        </aside>

        {/* Services Grid */}
        <div className="flex-grow space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-900">
              {selectedCategory === 'all' ? 'جميع الخدمات' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <div className="relative group w-full sm:w-72">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="ابحث عن خدمة..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredServices.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[3rem] border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-bold">لا توجد نتائج لبحثك</p>
              </div>
            ) : (
              filteredServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white group rounded-[2.5rem] p-4 border border-slate-100 hover:border-primary/20 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col"
                >
                  <div className="aspect-[4/3] rounded-[2rem] overflow-hidden relative mb-6">
                    <img 
                      src={service.imageUrl || `https://picsum.photos/seed/${service.name}/800/600`} 
                      alt={service.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-black text-primary shadow-lg">
                      {service.price} د.أ
                    </div>
                    {service.isAvailable === false && (
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg z-10">
                        غير متوفر
                      </div>
                    )}
                  </div>
                  <div className="px-2 pb-2 flex flex-col flex-grow space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                        {service.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                    <button 
                      onClick={() => service.isAvailable !== false && setOrderModal({ show: true, service })}
                      disabled={service.isAvailable === false}
                      className={`mt-auto w-full py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        service.isAvailable === false 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-50 group-hover:bg-primary group-hover:text-white'
                      }`}
                    >
                      {service.isAvailable === false ? 'غير متوفر حالياً' : 'شحن الآن'}
                      {service.isAvailable !== false && <ArrowUpRight className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <section className="py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: CheckCircle2, title: 'أمان تام', desc: 'جميع معاملاتك محمية ومشفرة بأحدث التقنيات' },
            { icon: Zap, title: 'سرعة في التنفيذ', desc: 'يتم تنفيذ طلبك خلال دقائق معدودة من الطلب' },
            { icon: MessageCircle, title: 'دعم فني متواصل', desc: 'فريقنا متاح دائماً لمساعدتك عبر الواتساب' }
          ].map((badge, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-4 p-8 bg-white rounded-[2.5rem] border border-slate-100">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <badge.icon className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-lg font-black text-slate-900">{badge.title}</h4>
              <p className="text-sm text-slate-500 font-medium">{badge.desc}</p>
            </div>
          ))}
        </div>
      </section>

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
