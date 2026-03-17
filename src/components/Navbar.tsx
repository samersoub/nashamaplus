import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { auth } from '../firebase';
import { LogOut, User, LayoutDashboard, Wallet, Zap, Search, Youtube, Instagram, MessageCircle } from 'lucide-react';

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
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Left Side: User Actions & Balance */}
        <div className="flex items-center gap-2 lg:gap-4 order-1">
          {user ? (
            <div className="flex items-center gap-2">
              <Link 
                to="/profile"
                className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <Wallet className="w-3.5 h-3.5 lg:w-4 h-4 text-primary" />
                <span className="text-[10px] lg:text-xs font-black text-slate-900">{profile?.balance.toFixed(2)} د.أ</span>
              </Link>
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
                  className="p-2.5 text-slate-600 hover:text-primary transition-colors bg-slate-50 rounded-2xl border border-slate-100"
                  title="لوحة التحكم"
                >
                  <LayoutDashboard className="w-5 h-5" />
                </Link>
              )}
              <button 
                onClick={handleLogout}
                className="p-2.5 text-slate-600 hover:text-red-500 transition-colors bg-slate-50 rounded-2xl border border-slate-100"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-2xl font-black text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">تسجيل الدخول</span>
            </Link>
          )}
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md order-2">
          <form onSubmit={handleSearch} className="relative w-full group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="ابحث عن لعبتك المفضلة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-xs"
            />
          </form>
        </div>

        {/* Right Side: Logo */}
        <Link to="/" className="flex items-center gap-3 group order-3">
          <div className="text-right hidden sm:block">
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">
              نشامى <span className="text-primary">بلس</span>
            </h1>
          </div>
          <div className="bg-primary p-2.5 rounded-2xl rotate-12 group-hover:rotate-0 transition-all duration-500 shadow-xl shadow-primary/20">
            <Zap className="w-6 h-6 text-white fill-current" />
          </div>
        </Link>
      </div>
    </nav>
  );
};
