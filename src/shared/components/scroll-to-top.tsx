'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="الرجوع للأعلى"
      className={`fixed bottom-6 left-6 z-40 p-3 rounded-2xl bg-blue-700/90 hover:bg-blue-600 text-white shadow-xl shadow-blue-900/25 border border-white/20 backdrop-blur-md transition-all duration-300 cursor-pointer active:scale-90 ${
        show
          ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
          : 'opacity-0 translate-y-6 pointer-events-none scale-75'
      }`}
    >
      <ArrowUp className="w-5 h-5 stroke-[2.5]" />
    </button>
  );
}

