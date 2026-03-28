import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full px-8 py-5 flex items-center justify-between border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Bot className="w-6 h-6 text-indigo-500" />
        <span className="text-[17px] font-semibold text-white tracking-wide">DealOS</span>
      </div>
      <div className="flex items-center gap-8">
         <a href="#how-it-works" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">How it works</a>
         <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Features</a>
         <Link to="/dashboard" className="text-sm font-semibold bg-white text-zinc-950 px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-colors">Dashboard</Link>
      </div>
    </nav>
  );
}
