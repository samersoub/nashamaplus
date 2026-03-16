import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Instagram, Youtube, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-20 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-primary p-2 rounded-xl rotate-12 group-hover:rotate-0 transition-all duration-300 shadow-lg shadow-primary/20">
                <Zap className="w-5 h-5 text-white fill-current" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter text-white leading-none">
                نشامى <span className="text-primary">بلس</span>
              </h2>
            </Link>
            <p className="text-sm leading-relaxed font-medium">
              المنصة رقم #1 في الأردن لشحن الألعاب والبطاقات الرقمية. نوفر لك أفضل الأسعار مع تسليم فوري وآمن.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 bg-slate-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-slate-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="https://wa.me/962781254771" className="p-2 bg-slate-800 rounded-xl hover:bg-primary hover:text-white transition-all">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-white font-black text-lg">روابط سريعة</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link to="/" className="hover:text-primary transition-colors">الرئيسية</Link></li>
              <li><Link to="/profile" className="hover:text-primary transition-colors">حسابي</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">تسجيل الدخول</Link></li>
              <li><a href="https://wa.me/962781254771" className="hover:text-primary transition-colors">الدعم الفني</a></li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className="text-white font-black text-lg">أهم الخدمات</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li><button className="hover:text-primary transition-colors">شحن شدات ببجي</button></li>
              <li><button className="hover:text-primary transition-colors">جواهر فري فاير</button></li>
              <li><button className="hover:text-primary transition-colors">بطاقات جوجل بلاي</button></li>
              <li><button className="hover:text-primary transition-colors">شحن يلا لودو</button></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h3 className="text-white font-black text-lg">تواصل معنا</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <span>+962 78 125 4771</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span>support@nashama.com</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span>عمان، الأردن</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold">
          <p>© {new Date().getFullYear()} نشامى بلس. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-6">
            <Link to="#" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
            <Link to="#" className="hover:text-white transition-colors">شروط الاستخدام</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
