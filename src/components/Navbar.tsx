import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-zinc-950/50 backdrop-blur-md border-b border-white/10"
    >
      <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Bot className="w-6 h-6 text-indigo-400" />
        <span>Deal<span className="text-indigo-400">OS</span></span>
      </Link>
      <div className="flex items-center gap-6 text-sm font-medium">
        <a href="#how-it-works" className="text-zinc-400 hover:text-white transition-colors">How it works</a>
        <a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
        <Link to="/dashboard" className="px-4 py-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors">
          Dashboard
        </Link>
      </div>
    </motion.nav>
  );
}
