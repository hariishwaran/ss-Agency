import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const supabase = getSupabase();

  useEffect(() => {
    // Check for errors in the URL hash (common for Supabase Auth redirects)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');
      
      if (errorCode === 'otp_expired') {
        setError('The confirmation link has expired. Please try signing up again or request a new password reset.');
      } else if (errorDescription) {
        setError(errorDescription.replace(/\+/g, ' '));
      }
    }

    // Also check query parameters
    const queryParams = new URLSearchParams(window.location.search);
    const errorQuery = queryParams.get('error_description');
    if (errorQuery) {
      setError(errorQuery);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone: phone,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            }
          }
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          setSuccess('Success! Please check your email inbox to confirm your account before signing in.');
        } else if (data.session) {
          navigate('/');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden font-sans">
      {/* Background with Sky/Clouds vibe */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-300 via-blue-100 to-indigo-200" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/40 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[120px]" />
      </div>

      {/* Main Auth Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-[40px] shadow-2xl p-10 flex flex-col items-center">
          
          {/* Top Icon Area */}
          <div className="w-16 h-16 bg-white/80 rounded-2xl shadow-inner flex items-center justify-center mb-6 border border-white/50">
            <LogIn className="w-8 h-8 text-slate-800" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-10">
            {isSignUp ? 'Create your account' : 'Sign in with email'}
          </h1>

          <form onSubmit={handleAuth} className="w-full space-y-4">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Name Input */}
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Full Name"
                      required={isSignUp}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 transition-all duration-200 bg-white/50 focus:bg-white rounded-2xl border border-white/20 focus:border-indigo-500 outline-none placeholder:text-slate-400 text-slate-800 font-medium"
                    />
                  </div>
                  {/* Phone Input */}
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel"
                      placeholder="Phone Number"
                      required={isSignUp}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 transition-all duration-200 bg-white/50 focus:bg-white rounded-2xl border border-white/20 focus:border-indigo-500 outline-none placeholder:text-slate-400 text-slate-800 font-medium"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Input */}
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

            {/* Password Input */}
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

            <div className="flex justify-end">
              <button type="button" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl w-full">
                <p className="text-red-600 text-xs font-semibold text-center">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl w-full">
                <p className="text-emerald-600 text-xs font-semibold text-center">{success}</p>
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
                  {isSignUp ? 'Create Account' : 'Get Started'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pb-4" />

          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-8 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>

      {/* Decorative Floating Blobs for background texture */}
      <div className="absolute top-[20%] right-[10%] w-32 h-32 bg-yellow-200/20 blur-[60px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-40 h-40 bg-pink-200/20 blur-[70px] rounded-full pointer-events-none" />
    </div>
  );
}
