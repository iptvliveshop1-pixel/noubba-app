'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { User, Phone, Mail, Lock, ArrowRight, Scissors, Eye, EyeOff, ChevronLeft } from 'lucide-react';

export default function ClientSignup() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // New state for password toggle
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
        toast.success("Compte créé ! Bienvenue.", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
        // Send them to their new customer dashboard
        router.push('/client/dashboard'); 
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-blue-200">
      
      {/* HEADER SECTION (Upgraded with Ambient UI) */}
      <div className="h-[35vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-indigo-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="absolute top-4 sm:top-6 w-full left-0 px-4 z-20">
          <Link href="/" className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md shadow-sm">
            <ChevronLeft className="w-5 h-5 pr-0.5" />
          </Link>
        </div>

        <div className="relative z-10 mt-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <Scissors className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-2">
            Rejoignez Noubba
          </h1>
          <p className="text-blue-200 font-medium text-sm">
            Gérez vos passages chez le coiffeur sans attendre.
          </p>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <form id="client-signup" onSubmit={handleSignup} className="space-y-4 max-w-sm mx-auto">
          
          {/* Full Name Input */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all shadow-sm flex items-center gap-4 group">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">
              <User className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-600 transition-colors">Nom complet</label>
              <input 
                type="text" 
                required 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                placeholder="Ex: Karim Benali" 
              />
            </div>
          </div>

          {/* Phone Input */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all shadow-sm flex items-center gap-4 group">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">
              <Phone className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-600 transition-colors">Téléphone</label>
              <input 
                type="tel" 
                required 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                placeholder="06 00 00 00 00" 
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all shadow-sm flex items-center gap-4 group">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">
              <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-600 transition-colors">Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                placeholder="votre@email.com" 
              />
            </div>
          </div>

          {/* Password Input with Toggle */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all shadow-sm flex items-center gap-4 group relative">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">
              <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600" />
            </div>
            <div className="flex-1 pr-10">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 group-focus-within:text-blue-600 transition-colors">Mot de passe</label>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                minLength={6}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                placeholder="••••••••" 
              />
            </div>
            {/* The Password Toggle Button */}
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full h-14 mt-6 bg-blue-600 active:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Créer mon compte <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 font-medium text-sm mb-6">
            Déjà client ?{' '}
            <Link href="/client/login" className="text-blue-600 font-bold hover:underline">
              Se connecter
            </Link>
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Rejoignez des milliers de clients qui ne font plus la queue.
          </p>
        </div>
      </div>
    </div>
  );
}