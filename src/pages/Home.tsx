import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError } from '../App';
import { Service, Category, Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, CheckCircle2, XCircle, AlertCircle, Zap, ChevronLeft, ChevronRight, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { sendOrderNotificationToWhatsApp } from '../services/whatsapp';

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
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) throw new Error('لم يتم العثور على ملف المستخدم');
        
        const currentBalance = userDoc.data().balance;
        const isAdmin = userDoc.data().role === 'admin';
        
        if (!isAdmin && currentBalance < orderModal.service!.price) {
          throw new Error('رصيدك غير كافٍ. يرجى شحن محفظتك.');
        }

        if (!isAdmin) {
          transaction.update(userRef, {
            balance: currentBalance - orderModal.service!.price
          });
        }

        const orderData: Omit<Order, 'id'> = {
          userId: user.uid,
          userEmail: user.email!,
          serviceId: orderModal.service!.id,
          serviceName: orderModal.service!.name,
          amount: orderModal.service!.price,
          playerAppId,
          status: 'pending',
          createdAt: serverTimestamp() as any
        };

        const ordersRef = collection(db, 'orders');
        const newOrderRef = doc(ordersRef);
        transaction.set(newOrderRef, orderData);
      });

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
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Discounts */}
        <div className="lg:col-span-3 hidden lg:block">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary fill-current" />
                تخفيضات المتجر
              </h3>
            </div>
            <div className="space-y-1">
              {featuredServices.map((service) => (
                <div key={service.id} className="sidebar-item group" onClick={() => setOrderModal({ show: true, service })}>
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                    <img src={service.imageUrl || `https://picsum.photos/seed/${service.name}/100/100`} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-primary transition-colors">{service.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Banner Slider */}
        <div className="lg:col-span-9">
          <div className="relative rounded-3xl overflow-hidden aspect-[21/9] lg:aspect-[2.5/1] shadow-2xl shadow-primary/10 group">
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80" 
              alt="Banner" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent flex items-center justify-end p-12 text-right">
              <div className="max-w-md space-y-6">
                <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight">
                  شحن <br /> <span className="text-primary">تطبيقات وألعاب</span> فوراً
                </h2>
                <p className="text-lg text-white/80 font-medium">لاما شات، بيجو لايف، ببجي، وجواكر - تسليم آمن وسريع</p>
                <button className="btn-primary flex items-center gap-2 group/btn">
                  <ShoppingCart className="w-5 h-5" />
                  ابدأ الشحن الآن
                </button>
              </div>
            </div>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-white w-6' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          className={`category-card ${selectedCategory === 'all' ? 'ring-2 ring-primary ring-offset-2' : ''}`} 
          onClick={() => setSelectedCategory('all')}
        >
          <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80" alt="All" referrerPolicy="no-referrer" />
          <div className="overlay" />
          <span className="label">الكل</span>
        </div>
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className={`category-card ${selectedCategory === cat.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <img 
              src={cat.name.includes('دردشة') 
                ? 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80' 
                : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80'} 
              alt={cat.name} 
              referrerPolicy="no-referrer" 
            />
            <div className="overlay" />
            <span className="label">{cat.name}</span>
          </div>
        ))}
      </section>

      {/* Most Requested Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            الأكثر طلباً
          </h2>
          <button className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
            المزيد
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredServices.map((service) => (
            <motion.div 
              key={service.id}
              whileHover={{ y: -5 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer group"
              onClick={() => setOrderModal({ show: true, service })}
            >
              <div className="flex-1 text-right">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors truncate">{service.name}</h3>
                <p className="text-xs text-slate-400 mt-1 truncate">{service.description}</p>
              </div>
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-50 flex-shrink-0">
                <img src={service.imageUrl || `https://picsum.photos/seed/${service.name}/200/200`} alt={service.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* New Products Section */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-12">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            منتجات جديدة
          </h2>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button 
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'all' 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              الكل
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => setOrderModal({ show: true, service })}
            >
              <div className="aspect-square overflow-hidden relative">
                <img 
                  src={service.imageUrl || `https://picsum.photos/seed/${service.name}/400/400`} 
                  alt={service.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3">
                  <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-primary shadow-sm">
                    {service.price} دينار
                  </div>
                </div>
              </div>
              <div className="p-4 text-center">
                <h3 className="text-xs font-black text-slate-800 group-hover:text-primary transition-colors line-clamp-2 min-h-[2rem]">
                  {service.name}
                </h3>
                <button className="mt-3 w-full py-2 bg-slate-50 group-hover:bg-primary group-hover:text-white rounded-xl text-[10px] font-bold text-slate-600 transition-all">
                  اطلب الآن
                </button>
              </div>
            </motion.div>
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
