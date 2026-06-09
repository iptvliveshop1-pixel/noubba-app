'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Scissors } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Connexion en cours...", { style: { borderRadius: '12px' }});

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Email ou mot de passe incorrect.", { id: toastId, style: { borderRadius: '12px', background: '#333', color: '#fff' }});
      setIsLoading(false);
    } else {
      toast.success("Connexion réussie !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
      
      // The Traffic Cop: Route Admins to Admin Panel, Barbers to Dashboard
      if (email.toLowerCase() === 'zrirjawad@gmail.com') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 font-sans pb-12 sm:p-6 selection:bg-amber-200">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 sm:p-10 relative overflow-hidden">
        
        {/* Subtle Slate Luxury Top Flare */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-slate-900 to-slate-700 opacity-90"></div>

        <div className="text-center mb-10 mt-2">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/10">
            <Scissors className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">Bon retour</h1>
          <p className="text-slate-500 font-medium">Connectez-vous à votre espace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all duration-300 text-base" 
            placeholder="Adresse Email" 
          />
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all duration-300 text-base" 
            placeholder="Mot de passe" 
          />

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full mt-8 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-extrabold py-4.5 rounded-2xl transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)] active:scale-[0.98] disabled:opacity-70 text-lg flex justify-center items-center gap-2 h-14"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Se connecter"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm font-medium text-slate-500">
            Nouveau sur Noubba ?{' '}
            <Link href="/signup" className="text-amber-600 hover:text-amber-700 font-bold transition-colors">
              Créer mon espace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}