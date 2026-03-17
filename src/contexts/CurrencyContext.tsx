import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'JOD' | 'USD' | 'SAR' | 'AED' | 'TRY' | 'EGP' | 'SYP' | 'KWD' | 'QAR' | 'IQD' | 'LBP';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  rate: number; // 1 JOD = X Currency
  name: string;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  JOD: { code: 'JOD', symbol: 'د.أ', rate: 1, name: 'دينار أردني' },
  USD: { code: 'USD', symbol: '$', rate: 1.41, name: 'دولار أمريكي' },
  SAR: { code: 'SAR', symbol: 'ر.س', rate: 5.29, name: 'ريال سعودي' },
  AED: { code: 'AED', symbol: 'د.إ', rate: 5.18, name: 'درهم إماراتي' },
  TRY: { code: 'TRY', symbol: '₺', rate: 45.0, name: 'ليرة تركية' },
  EGP: { code: 'EGP', symbol: 'ج.م', rate: 67.0, name: 'جنيه مصري' },
  SYP: { code: 'SYP', symbol: 'ل.س', rate: 18330.0, name: 'ليرة سورية' },
  KWD: { code: 'KWD', symbol: 'د.ك', rate: 0.43, name: 'دينار كويتي' },
  QAR: { code: 'QAR', symbol: 'ر.ق', rate: 5.13, name: 'ريال قطري' },
  IQD: { code: 'IQD', symbol: 'ع.د', rate: 1847.0, name: 'دينار عراقي' },
  LBP: { code: 'LBP', symbol: 'ل.ل', rate: 126200.0, name: 'ليرة لبنانية' },
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (code: CurrencyCode) => void;
  convert: (amount: number) => string;
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('preferred_currency');
    return (saved as CurrencyCode) || 'JOD';
  });

  const currency = CURRENCIES[currencyCode];

  useEffect(() => {
    localStorage.setItem('preferred_currency', currencyCode);
  }, [currencyCode]);

  const convert = (amount: number) => {
    return (amount * currency.rate).toFixed(2);
  };

  const format = (amount: number) => {
    const converted = convert(amount);
    return `${converted} ${currency.symbol}`;
  };

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyCode(code);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
