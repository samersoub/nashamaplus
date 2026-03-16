import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { auth } from '../firebase';
import { LogOut, User, LayoutDashboard, Wallet, Zap, Search, Youtube, Instagram, MessageCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../constants';

export const Navbar: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Left Side: Icons & Social */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 mr-2 border-r border-slate-100 pr-2">
            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
              <Instagram className="w-4 h-4" />
            </button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-primary transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>

          {user ? (
            <div className="flex items-center gap-1">
              <Link
                to="/profile"
                className="p-2.5 text-slate-600 hover:text-primary transition-colors bg-slate-50 rounded-2xl border border-slate-100"
                title="الملف الشخصي"
              >
                <User className="w-5 h-5" />
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="p-2.5 text-slate-600 hover:text-primary transition-colors"
                  title="لوحة التحكم"
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-600 hover:text-red-500 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="p-2.5 text-slate-600 hover:text-primary transition-colors bg-slate-50 rounded-2xl border border-slate-100">
              <User className="w-5 h-5" />
            </Link>
          )}
        </div>

        {/* Center: Search Bar (New) */}
        <div className="flex-grow max-w-md hidden md:block">
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              placeholder="ابحث عن الخدمة التي تريدها..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-2.5 pr-12 pl-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </button>
          </form>
        </div>

        {/* Center/Right: Navigation Links (Desktop) */}
        <div className="hidden xl:flex items-center gap-6 shrink-0">
          <Link to="/" className="text-xs font-black text-slate-600 hover:text-primary transition-colors uppercase tracking-tighter">شحن الألعاب</Link>
          <Link to="/" className="text-xs font-black text-slate-600 hover:text-primary transition-colors uppercase tracking-tighter">شحن التطبيقات</Link>
          <Link to="/" className="text-xs font-black text-slate-600 hover:text-primary transition-colors uppercase tracking-tighter">بطاقات</Link>
        </div>

        {/* Right Side: Logo */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="text-right hidden sm:block">
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">
              نشامى <span className="text-primary">بلس</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">لشحن الخدمات الرقمية</p>
          </div>
          <div className="bg-primary p-2.5 rounded-2xl rotate-12 group-hover:rotate-0 transition-all duration-300 shadow-xl shadow-primary/20">
            <Zap className="w-6 h-6 text-white fill-current" />
          </div>
        </Link>
      </div>
    </nav>
  );
};
