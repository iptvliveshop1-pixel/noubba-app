'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Scissors, Eye, EyeOff, ChevronLeft } from 'lucide-react';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Connexion en cours...");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      toast.error("Email ou mot de passe incorrect.", { id: toastId });
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // ✨ THE FIX: Check if they just scanned a QR code before logging in
      const pendingBarberId = localStorage.getItem('pending_booking_barber_id');
      
      if (pendingBarberId) {
        toast.loading("Réservation de votre place...", { id: toastId });
        
        // We need to fetch their name/phone from the DB first
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (customer) {
          const { error: queueError } = await supabase.from('queue').insert([{
            barber_id: pendingBarberId,
            customer_id: authData.user.id,
            customer_name: customer.full_name,
            whatsapp_number: customer.phone_number,
            status: 'waiting'
          }]);

          if (queueError) {
            toast.error("Connecté, mais erreur de réservation.", { id: toastId });
          } else {
            localStorage.removeItem('pending_booking_barber_id');
            toast.success("Place réservée avec succès !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
          }
        }
      } else {
        toast.success("Bon retour !", { id: toastId });
      }

      router.push('/client/dashboard');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-blue-200">
      <div className="h-[35vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <div className="absolute top-4 sm:top-6 w-full left-0 px-4 z-20">
          <Link href="/" className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md shadow-sm">
            <ChevronLeft className="w-5 h-5 pr-0.5" />
          </Link>
        </div>
        <div className="relative z-10 mt-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <Scissors className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-2">Bon retour</h1>
          <p className="text-blue-200 font-medium text-sm">Connectez-vous pour suivre votre place.</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 group">
            <Mail className="w-5 h-5 text-slate-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="votre@email.com" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 relative group">
            <Lock className="w-5 h-5 text-slate-400" />
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 p-2 text-slate-400">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button type="submit" disabled={isLoading} className="w-full h-14 mt-6 bg-blue-600 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2">
            {isLoading ? "Chargement..." : "Se connecter"}
          </button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-slate-500 font-medium text-sm">
            Nouveau client ?{' '}
            <Link href="/client/signup" className="text-blue-600 font-bold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}