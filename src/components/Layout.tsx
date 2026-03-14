import React from 'react';
import { Navbar } from './Navbar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} نشامى بلس. جميع الحقوق محفوظة.</p>
          <p className="mt-2">منصة شحن الخدمات الرقمية</p>
        </div>
      </footer>
    </div>
  );
};
