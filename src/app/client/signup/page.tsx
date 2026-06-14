'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { User, Phone, Mail, Lock, ArrowRight, Scissors } from 'lucide-react';

export default function ClientSignup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("Création de votre compte...");

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      toast.error(authError.message, { id: toastId });
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Save their profile in the new customers table
      const { error: dbError } = await supabase.from('customers').insert([{
        id: authData.user.id,
        full_name: fullName,
        phone_number: phone
      }]);

      if (dbError) {
        toast.error("Erreur lors de l'enregistrement du profil.", { id: toastId });
      } else {
        toast.success("Compte créé ! Bienvenue.", { id: toastId });
        // Send them to their new customer dashboard
        router.push('/client/dashboard'); 
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      <div className="h-[25vh] w-full bg-slate-900 relative flex flex-col justify-center px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-slate-900 to-black"></div>
        <div className="relative z-10">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-3">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Rejoignez Noubba</h1>
          <p className="text-slate-400 text-sm">Gérez vos passages chez le coiffeur sans attendre.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-t-[2rem] -mt-6 relative z-20 px-6 pt-8 pb-32 shadow-xl">
        <form id="client-signup" onSubmit={handleSignup} className="space-y-4">
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <User className="w-5 h-5 text-slate-400 ml-2" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Nom complet</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" placeholder="Ex: Karim Benali" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Phone className="w-5 h-5 text-slate-400 ml-2" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Téléphone</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" placeholder="06 00 00 00 00" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Mail className="w-5 h-5 text-slate-400 ml-2" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" placeholder="karim@email.com" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Lock className="w-5 h-5 text-slate-400 ml-2" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" placeholder="••••••••" />
            </div>
          </div>

        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">Déjà client ? <Link href="/client/login" className="text-blue-600 font-bold hover:underline">Se connecter</Link></p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 z-50">
        <button type="submit" form="client-signup" disabled={isLoading} className="w-full h-14 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl transition-colors flex justify-center items-center gap-2">
          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Créer mon compte <ArrowRight className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
}