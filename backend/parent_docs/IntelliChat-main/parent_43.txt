import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaWhatsapp } from 'react-icons/fa';

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
      <div className="text-center">
        {/* Logo Circle */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-24 h-24 mb-8 mx-auto"
        >
          <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
            <FaWhatsapp className="w-16 h-16 text-white" />
          </div>
          {/* Pulsing ring effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-blue-400"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-bold text-white mb-2"
        >
          IntelliChat
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/80 text-lg mb-12"
        >
          Intelligent Conversations Await
        </motion.p>

        {/* Progress Bar Container */}
        <div className="w-64 mx-auto">
          <div className="bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <motion.div
              className="bg-white h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Progress Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-4 text-white/90 text-sm"
          >
            Loading... {Math.round(progress)}%
          </motion.div>

          {/* Loading Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-white rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Bottom Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-white/70 text-xs mt-8"
        >
          Initializing app...
        </motion.p>
      </div>
    </div>
  );
};

export default LoadingScreen;