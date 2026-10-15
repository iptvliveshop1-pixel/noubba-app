'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Scissors, ChevronLeft, Eye, EyeOff } from 'lucide-react';

const ADMIN_EMAILS = ['zrirjawad@gmail.com', 'zrirsr@gmail.com'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    const toastId = toast.loading("Connexion en cours...");
    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({ 
      email: cleanEmail, 
      password 
    });

    if (error) {
      toast.error(
        error.message === 'Invalid login credentials' 
          ? 'Email ou mot de passe incorrect.' 
          : error.message, 
        { id: toastId }
      );
      setIsLoading(false);
    } else {
      toast.success("Bon retour !", { id: toastId });
      
      // Check if CEO/Admin is logging in
      if (ADMIN_EMAILS.includes(cleanEmail)) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) toast.error("Erreur avec Google.");
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      <div className="h-[30vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <Link href="/" className="absolute top-6 left-6 w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md z-20">
          <ChevronLeft className="w-5 h-5 pr-0.5" />
        </Link>
        <div className="relative z-10 mt-4">
          <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <Scissors className="w-7 h-7 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Bon retour.</h1>
          <p className="text-slate-400 font-medium text-sm">Connectez-vous à votre espace salon.</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-40 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        
        {/* NATIVE GOOGLE BUTTON */}
        <button onClick={handleGoogleLogin} type="button" className="w-full bg-white border border-slate-200 text-slate-900 font-bold py-4 px-4 rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all mb-6">
          <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ou avec Email</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <form id="login-form" onSubmit={handleLogin} className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-slate-400" /></div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Adresse Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                placeholder="contact@salon.com" 
              />
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm flex items-center gap-4 relative">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><Lock className="w-5 h-5 text-slate-400" /></div>
            <div className="flex-1 pr-8">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Mot de passe</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                placeholder="••••••••" 
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {/* FORGOT PASSWORD LINK */}
          <div className="flex justify-end mt-2">
            <Link href="/forgot-password" className="text-amber-600 text-sm font-bold hover:underline">Mot de passe oublié ?</Link>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm font-medium">Pas encore de compte ? <Link href="/signup" className="text-slate-900 font-bold hover:underline">Créer un espace</Link></p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button type="submit" form="login-form" disabled={isLoading} className="w-full h-16 bg-slate-900 active:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-colors text-lg flex justify-center items-center gap-2">
          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Se connecter <ArrowRight className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
}