import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Target, Search, Mail, BarChart3, MessageSquare } from 'lucide-react';

export default function Landing() {
  const agents = [
    {
      icon: <Bot className="w-6 h-6 text-indigo-400" />,
      title: "Orchestrator",
      description: "Plans the pipeline and delegates tasks based on your business config."
    },
    {
      icon: <Target className="w-6 h-6 text-indigo-400" />,
      title: "Lead Hunter",
      description: "Scours the web, LinkedIn, and directories to find your ideal ICP."
    },
    {
      icon: <Search className="w-6 h-6 text-indigo-400" />,
      title: "Research Agent",
      description: "Visits lead websites to extract pain points and context."
    },
    {
      icon: <Mail className="w-6 h-6 text-indigo-400" />,
      title: "Email Writer",
      description: "Drafts hyper-personalized emails using context and product info."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-indigo-400" />,
      title: "Scoring Agent",
      description: "Scores leads 0-100 based on purchase intent and fit."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-indigo-400" />,
      title: "Negotiator",
      description: "Reads replies, detects sentiment, and handles objections."
    }
  ];

  return (
    <div className="bg-[#09090b] min-h-screen w-full font-sans selection:bg-indigo-500/30">
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-16">
        
        {/* Glow Effects (Subtle behind the text) */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto">
          
          {/* DealOS Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-700/50 bg-[#18181b]/80 backdrop-blur-sm mb-10"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-xs text-zinc-300 font-medium">DealOS 2.0 is live</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[3.5rem] md:text-[5rem] lg:text-[6.5rem] font-bold tracking-tight text-white mb-6 leading-[1.05]"
          >
            Your AI Sales Team.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-indigo-400 to-purple-400">Working 24/7.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            An autonomous multi-agent system that finds leads, researches prospects, writes hyper-personalized emails, and negotiates deals. While you sleep.
          </motion.p>

          {/* Call to Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link 
              to="/config" 
              className="group flex items-center justify-center gap-2 bg-white text-zinc-950 px-8 py-3.5 rounded-full font-semibold hover:bg-zinc-100 transition-colors w-full sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="how-it-works" className="relative z-10 py-24 bg-[#09090b]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">6 Agents. 1 Goal.</h2>
            <p className="text-zinc-400 text-lg">How the autonomous pipeline works end-to-end.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#121214] border border-white/5 rounded-2xl p-8 hover:bg-[#18181b] transition-colors shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                  {agent.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{agent.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {agent.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
