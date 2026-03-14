import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { Zap, Chrome } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-10 md:p-16 rounded-[3rem] w-full max-w-lg text-center space-y-10 border border-white/50 shadow-2xl shadow-primary/10 relative overflow-hidden"
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="bg-gradient-to-br from-primary to-primary-dark w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/30 transform -rotate-6">
            <Zap className="w-12 h-12 text-white fill-current" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">نشامى بلس</h1>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">بوابتك المتكاملة لشحن الألعاب والخدمات الرقمية بأفضل الأسعار.</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white border border-slate-100 hover:border-primary/30 text-slate-700 py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-slate-200/50 hover:shadow-primary/10 active:scale-95 group"
          >
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
              <Chrome className="w-7 h-7 text-blue-500" />
            </div>
            <span>المتابعة باستخدام جوجل</span>
          </button>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            تسجيل دخول آمن وسريع
          </p>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            من خلال المتابعة، فإنك توافق على <span className="text-primary cursor-pointer hover:underline">شروط الخدمة</span> و <span className="text-primary cursor-pointer hover:underline">سياسة الخصوصية</span> الخاصة بنا.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
