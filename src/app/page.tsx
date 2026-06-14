'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, QrCode, ArrowRight, Timer, CheckCircle2, Smartphone, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleAppDownload = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          toast.success("Installation en cours !");
        }
        setDeferredPrompt(null);
      });
    } else {
      toast('Pour installer l\'app sur iPhone : Appuyez sur le bouton "Partager" en bas de Safari, puis sur "Sur l\'écran d\'accueil".', {
        icon: '📱',
        duration: 6000,
        style: { borderRadius: '12px', background: '#1e293b', color: '#fff', maxWidth: '400px' },
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans selection:bg-amber-200">
      
      {/* NATIVE PREMIUM NAVBAR */}
      <nav className="absolute top-0 w-full px-6 py-6 flex justify-between items-center z-50 max-w-7xl mx-auto left-0 right-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Scissors className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-black text-2xl text-white tracking-tight">Noubba</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/client/login" className="hidden sm:block text-slate-300 hover:text-white font-bold text-sm transition-colors">
            Espace Client
          </Link>
          <Link href="/login" className="px-6 py-2.5 text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full transition-all shadow-lg active:scale-95">
            Connexion
          </Link>
        </div>
      </nav>

      {/* REDESIGNED HERO SECTION */}
      <div className="relative pt-32 pb-0 lg:pt-40 lg:pb-0 px-6 bg-slate-900 overflow-hidden rounded-b-[3rem] shadow-2xl">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center mt-8">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-md border border-slate-700/50 text-amber-400 font-bold text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
            <Star className="w-4 h-4 fill-amber-400" /> Noubba V1.0 est en ligne
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            La nouvelle ère des salons de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">coiffure.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            Gérez votre file d'attente sur tablette, laissez vos clients suivre leur position en temps réel sur leur téléphone. 100% digital.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] text-lg">
              Créer mon Salon <ArrowRight className="w-5 h-5" />
            </Link>
            <button onClick={handleAppDownload} className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all backdrop-blur-md border border-white/10 active:scale-95 text-lg">
              <Smartphone className="w-5 h-5" /> Installer l'App Client
            </button>
          </div>

          {/* CSS-ONLY PRODUCT MOCKUP (Massive UI Upgrade) */}
          <div className="mt-16 mx-auto w-full max-w-3xl relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="relative mx-auto w-64 sm:w-80 h-[250px] sm:h-[300px] bg-slate-800 border-[6px] border-slate-700 rounded-t-[3rem] shadow-2xl overflow-hidden translate-y-10 group hover:translate-y-6 transition-transform duration-500">
              {/* iPhone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded-b-2xl z-20"></div>
              {/* App UI inside the phone */}
              <div className="w-full h-full bg-slate-50 pt-12 px-5 flex flex-col gap-3 relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Scissors className="w-5 h-5 text-amber-600" /></div>
                  <div className="h-4 bg-slate-200 rounded-full w-24"></div>
                </div>
                <div className="w-full h-20 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex justify-between items-center opacity-50">
                  <div className="flex gap-3 items-center"><div className="w-8 h-8 bg-slate-100 rounded-full"></div><div className="w-16 h-3 bg-slate-200 rounded-full"></div></div>
                </div>
                <div className="w-full h-24 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-sm p-4 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col gap-2"><div className="w-20 h-3 bg-blue-200 rounded-full"></div><div className="w-12 h-2 bg-blue-200/50 rounded-full"></div></div>
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
                  </div>
                </div>
              </div>
              {/* Gradient fade out at bottom */}
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-900 to-transparent z-30"></div>
            </div>
          </div>

        </div>
      </div>

      {/* HOW IT WORKS (Upgraded Cards) */}
      <div className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Comment ça marche ?</h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Une expérience premium qui respecte le temps de vos clients et optimise l'organisation de votre salon.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-slate-100 hover:border-amber-200 transition-all duration-300 group hover:-translate-y-2">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
              <QrCode className="w-7 h-7 text-amber-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">1. Scan & Réservation</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Le client scanne le QR Code affiché dans votre salon ou vitrine et prend sa place virtuellement en un clic.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-slate-100 hover:border-blue-200 transition-all duration-300 group hover:-translate-y-2">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
              <Timer className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">2. Suivi en Direct</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Fini l'attente sur les canapés. Le client suit sa position exacte en temps réel depuis son téléphone.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-slate-100 hover:border-emerald-200 transition-all duration-300 group hover:-translate-y-2">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-300">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">3. Alerte "En Route"</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Alertez-le quand c'est son tour. Il confirme qu'il est en route, et son statut devient vert sur votre tablette !</p>
          </div>

        </div>
      </div>

      {/* CTA SECTION */}
      <div className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900 to-black"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Prêt à moderniser votre salon ?</h2>
            <p className="text-slate-400 font-medium mb-8 max-w-lg mx-auto">Rejoignez les barbiers qui ont choisi Noubba pour offrir une expérience premium à leurs clients.</p>
            <Link href="/signup" className="inline-flex px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl items-center justify-center gap-2 transition-all active:scale-95 text-lg shadow-[0_0_30px_-10px_rgba(245,158,11,0.5)]">
              Créer mon compte gratuit <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Scissors className="w-4 h-4 text-slate-900" />
          </div>
          <span className="font-black text-xl text-slate-900 tracking-tight">Noubba</span>
        </div>
        <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} Noubba. Conçu pour les barbiers du Maroc.</p>
      </footer>

    </div>
  );
}