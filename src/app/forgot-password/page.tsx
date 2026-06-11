'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Mail, ArrowRight, ChevronLeft, KeyRound } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Envoi du lien...");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message, { id: toastId });
    } else {
      toast.success("Lien envoyé !", { id: toastId });
      setIsSent(true);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      <div className="h-[30vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <Link href="/login" className="absolute top-6 left-6 w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md z-20">
          <ChevronLeft className="w-5 h-5 pr-0.5" />
        </Link>
        <div className="relative z-10 mt-4">
          <div className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <KeyRound className="w-7 h-7 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Mot de passe oublié ?</h1>
          <p className="text-slate-400 font-medium text-sm">Pas de panique, ça arrive à tout le monde.</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        {isSent ? (
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center">
            <h3 className="text-emerald-800 font-black text-xl mb-2">Vérifiez vos emails</h3>
            <p className="text-emerald-600 font-medium text-sm">Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form id="reset-form" onSubmit={handleReset} className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Adresse Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="contact@salon.com" />
              </div>
            </div>
          </form>
        )}
      </div>

      {!isSent && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
          <button type="submit" form="reset-form" disabled={isLoading} className="w-full h-16 bg-slate-900 active:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-colors text-lg flex justify-center items-center gap-2">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Envoyer le lien <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      )}
    </div>
  );
}