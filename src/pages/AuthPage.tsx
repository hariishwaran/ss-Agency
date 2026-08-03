import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [email, setEmail] = useState('admin@admanager.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid email or password');
      }

      const { token } = await res.json();
      localStorage.setItem('auth_token', token);
      // Navigate and reload to re-check auth
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-300 via-blue-100 to-indigo-200" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/40 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-[40px] shadow-2xl p-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white/80 rounded-2xl shadow-inner flex items-center justify-center mb-6 border border-white/50">
            <LogIn className="w-8 h-8 text-slate-800" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sign in</h1>
          <p className="text-slate-500 text-sm mb-8">AdManager Executive Suite</p>

          <form onSubmit={handleAuth} className="w-full space-y-4">
            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-12 pr-4 transition-all duration-200 bg-white/50 focus:bg-white rounded-2xl border border-white/20 focus:border-indigo-500 outline-none placeholder:text-slate-400 text-slate-800 font-medium"
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-12 pr-12 transition-all duration-200 bg-white/50 focus:bg-white rounded-2xl border border-white/20 focus:border-indigo-500 outline-none placeholder:text-slate-400 text-slate-800 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Hint */}
            <p className="text-xs text-slate-400 text-center">
              Default: admin@admanager.com / admin123
            </p>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl w-full">
                <p className="text-red-600 text-xs font-semibold text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>

      <div className="absolute top-[20%] right-[10%] w-32 h-32 bg-yellow-200/20 blur-[60px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-40 h-40 bg-pink-200/20 blur-[70px] rounded-full pointer-events-none" />
    </div>
  );
}
