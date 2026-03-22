import React, { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  linkWithPhoneNumber, 
  PhoneAuthProvider,
  ConfirmationResult
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, CheckCircle2, Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const PhoneVerification: React.FC = () => {
  const { user, profile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, []);

  const handleSendOtp = async () => {
    if (!phoneNumber.startsWith('+')) {
      setError('يرجى إدخال رقم الهاتف بالصيغة الدولية (مثال: +96278...)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (user) {
        const result = await linkWithPhoneNumber(user, phoneNumber, window.recaptchaVerifier);
        setConfirmationResult(result);
        setStep('otp');
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('رقم الهاتف غير صالح');
      } else if (err.code === 'auth/too-many-requests') {
        setError('تم إرسال الكثير من الطلبات، يرجى المحاولة لاحقاً');
      } else {
        setError('حدث خطأ أثناء إرسال الكود. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!verificationCode || !confirmationResult) return;

    setIsLoading(true);
    setError(null);

    try {
      await confirmationResult.confirm(verificationCode);
      
      // Update Firestore profile
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        phoneNumber: phoneNumber,
        isPhoneVerified: true
      });
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('كود التحقق غير صحيح');
      } else {
        setError('حدث خطأ أثناء التحقق من الكود');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (profile?.isPhoneVerified) {
    return (
      <div className="text-center p-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">تم تفعيل الحساب بنجاح</h2>
        <p className="text-slate-500 font-bold">رقم هاتفك {profile.phoneNumber} مفعل الآن.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="bg-primary p-8 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black mb-2">تفعيل الحساب</h2>
          <p className="text-white/70 text-sm font-bold">يرجى تفعيل حسابك برقم الهاتف للأمان</p>
        </div>
      </div>

      <div className="p-8">
        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+962780000000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    dir="ltr"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-lg"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-400 font-bold mr-2">أدخل الرقم بالصيغة الدولية (+962...)</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleSendOtp}
                  disabled={isLoading || !phoneNumber}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      إرسال كود التحقق
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => auth.signOut()}
                  className="w-full py-3 text-slate-400 font-bold text-xs hover:text-red-500 transition-colors"
                >
                  تسجيل الخروج
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-2">كود التحقق</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-black text-center text-3xl tracking-[0.5em]"
                />
                <p className="mt-2 text-[10px] text-slate-400 font-bold text-center">تم إرسال الكود إلى {phoneNumber}</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('phone')}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  تغيير الرقم
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      تأكيد الكود
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div id="recaptcha-container"></div>
    </div>
  );
};

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
