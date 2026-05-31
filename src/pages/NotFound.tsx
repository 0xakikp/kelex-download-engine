import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-104px)] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display font-bold text-[clamp(4rem,12vw,10rem)] leading-none text-text-primary opacity-20">
          404
        </h1>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="font-display font-semibold text-2xl text-text-primary mt-4"
      >
        Page Not Found
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="text-text-secondary mt-2 max-w-md"
      >
        The page you are looking for does not exist or has been moved.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="flex items-center gap-3 mt-8"
      >
        <Link
          to="/"
          className="flex items-center gap-2 bg-accent-blue hover:opacity-90 text-white font-medium px-5 h-10 rounded-full transition-all text-sm"
        >
          <Home size={16} />
          Go Home
        </Link>
        <button
          onClick={() => history.back()}
          className="flex items-center gap-2 bg-bg-secondary border border-border-subtle hover:bg-bg-hover text-text-primary font-medium px-5 h-10 rounded-full transition-all text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </motion.div>
    </div>
  );
}
