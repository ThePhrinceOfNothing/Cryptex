import type { Variants } from 'framer-motion';

export const pageFadeIn: Variants = {
  initial: { 
    opacity: 0,
  },
  animate: { 
    opacity: 1, 
    transition: { 
      duration: 0.3, 
      ease: 'easeOut' 
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30
    }
  }
};

