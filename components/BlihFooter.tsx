'use client';

import { motion } from 'framer-motion';

export default function BlihFooter() {
  const handleClick = () => {
    window.open('https://blihmarketing.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200/50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 py-4">
        <button
          onClick={handleClick}
          className="w-full text-center transition-all duration-200 hover:opacity-80 active:opacity-70"
          aria-label="Visit Blih Marketing website"
        >
          <p
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '1.2',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#404040',
              cursor: 'pointer',
            }}
            className="hover:text-[#FF701A] transition-colors duration-200"
          >
            Powerd by Blih.
          </p>
        </button>
      </div>
    </motion.footer>
  );
}

