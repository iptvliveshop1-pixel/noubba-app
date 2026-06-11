'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Ensure they only access this page with a valid recovery token
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        toast.success('Entrez votre nouveau mot de passe');
      }
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Mise à jour...");

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success("Mot de passe mis à jour !", { id: toastId });
      router.push('/dashboard');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      <div className="h-[30vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <div className="relative z-10 mt-4">
          <div className="w-14 h-14 bg-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-7 h-7 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Nouveau accès.</h1>
          <p className="text-slate-400 font-medium text-sm">Créez un nouveau mot de passe sécurisé.</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <form id="update-form" onSubmit={handleUpdate} className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Nouveau mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="••••••••" />
            </div>
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button type="submit" form="update-form" disabled={isLoading} className="w-full h-16 bg-emerald-500 active:bg-emerald-400 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-colors text-lg flex justify-center items-center gap-2">
          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Enregistrer <ArrowRight className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
}