'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Scissors, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Création de votre espace...", { style: { borderRadius: '12px' }});

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      toast.error(`Erreur: ${authError.message}`, { id: toastId, style: { borderRadius: '12px', background: '#333', color: '#fff' }});
      setIsLoading(false);
      return;
    }

    if (!authData.user) {
      toast.error("Impossible de créer l'utilisateur.", { id: toastId });
      setIsLoading(false);
      return;
    }

    const { error: dbError } = await supabase.from('barbers').insert([{
      user_id: authData.user.id,
      shop_name: shopName,
      owner_name: ownerName,
      approval_status: 'pending'
    }]);

    if (dbError) {
      toast.error(`Erreur Base de données: ${dbError.message}`, { id: toastId });
    } else {
      toast.success("Compte créé avec succès !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
      setIsSuccess(true);
    }
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 text-center shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white flex items-center justify-center rounded-full mx-auto mb-8 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Compte créé ! 🎉</h2>
          <p className="text-slate-500 leading-relaxed text-lg mb-8 font-medium">
            Votre compte est en cours d'examen par notre équipe. Vous recevrez un accès dès qu'il sera approuvé.
          </p>
          <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20 w-full">
            Aller à la connexion <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 font-sans pb-12 sm:p-6 selection:bg-amber-200">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 sm:p-10 relative overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 opacity-90"></div>

        <div className="text-center mb-10 mt-2">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/10">
            <Scissors className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">Rejoindre Noubba</h1>
          <p className="text-slate-500 font-medium">Créer mon espace barbier</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <input 
            type="text" 
            required 
            value={shopName} 
            onChange={(e) => setShopName(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base" 
            placeholder="Nom du Salon (ex: Tarik Fade)" 
          />
          <input 
            type="text" 
            required 
            value={ownerName} 
            onChange={(e) => setOwnerName(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base" 
            placeholder="Votre Prénom (Pour votre lien URL)" 
          />
          <input 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base" 
            placeholder="Adresse Email" 
          />
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base" 
            placeholder="Mot de passe (Min. 6 caractères)" 
          />

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full mt-8 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold py-4.5 rounded-2xl transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_15px_30px_-10px_rgba(245,158,11,0.6)] active:scale-[0.98] disabled:opacity-70 text-lg flex justify-center items-center h-14"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "S'inscrire"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm font-medium text-slate-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-amber-600 hover:text-amber-700 font-bold transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}