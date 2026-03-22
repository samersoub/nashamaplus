import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { useAuth } from '../App';

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'مرحباً بك! أنا مساعد نشامى بلس الذكي. كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "عذراً، لم يتم إعداد مفتاح API الخاص بـ Gemini. يرجى التأكد من إضافته في إعدادات البيئة (Environment Variables)." 
      }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }]
          }
        ],
        config: {
          systemInstruction: `أنت مساعد ذكي لموقع "نشامى بلس" (Nashama Plus). 
          موقع نشامى بلس هو منصة أردنية رائدة لشحن الألعاب والبطاقات الرقمية.
          الخدمات المتوفرة تشمل: شحن شدات ببجي (PUBG UC)، جواهر فري فاير (Free Fire Diamonds)، بطاقات هدايا، وغيرها.
          يتميز الموقع بالسرعة والأمان والدعم الفني عبر الواتساب.
          العملة الأساسية هي الدينار الأردني (JOD) ولكن يمكن للمستخدم تغييرها من القائمة العلوية.
          معلومات المستخدم الحالي: ${profile ? `الاسم: ${profile.displayName}, الرصيد: ${profile.balance} دينار` : 'زائر غير مسجل'}.
          كن ودوداً، مهنياً، وأجب باللغة العربية بلهجة أردنية خفيفة أو لغة عربية فصحى بسيطة.`
        }
      });

      const modelResponse = response.text || "عذراً، حدث خطأ ما. حاول مرة أخرى.";
      setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "عذراً، أواجه مشكلة في الاتصال حالياً. يرجى المحاولة لاحقاً." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-start">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm">مساعد نشامى بلس</h3>
                  <p className="text-[10px] opacity-70 font-bold">متصل الآن</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} items-start gap-2`}
                >
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-100 rounded-tr-none' 
                    : 'bg-primary text-white shadow-lg shadow-primary/10 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end items-center gap-2">
                  <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب سؤالك هنا..."
                  className="flex-1 pr-4 pl-12 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-xs"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute left-2 p-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 disabled:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <div className="flex flex-col items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-white rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center group relative overflow-hidden border-2 border-primary/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-100" />
          {isOpen ? (
            <X className="w-8 h-8 text-primary relative z-10" />
          ) : (
            <motion.div
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10 w-12 h-12"
            >
              <img 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=Nashama&backgroundColor=b6e3f4,c0aede,d1d4f9" 
                alt="AI Assistant"
                className="w-full h-full"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
          {!isOpen && (
            <span className="absolute top-2 right-2 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20" />
          )}
        </motion.button>
        {!isOpen && (
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-black text-primary bg-white px-3 py-1 rounded-full shadow-lg border border-slate-100"
          >
            أسألني
          </motion.span>
        )}
      </div>
    </div>
  );
};
