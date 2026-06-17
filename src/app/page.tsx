'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Scissors, QrCode, ArrowRight, Timer, CheckCircle2, Smartphone, User, Store, MessageCircle, LayoutDashboard, HelpCircle, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Home() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isStandaloneUnauth, setIsStandaloneUnauth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAppMode = async () => {
      const isInstalledApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      
      if (isInstalledApp) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: barber } = await supabase
            .from('barbers')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
            
          if (barber) {
            router.push('/dashboard'); 
          } else {
            router.push('/client/dashboard'); 
          }
        } else {
          setIsStandaloneUnauth(true);
          setIsCheckingAuth(false);
        }
      } else {
        setIsCheckingAuth(false);
      }
    };

    checkAppMode();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [router]);

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

  if (isCheckingAuth) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isStandaloneUnauth) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto mb-6">
            <Scissors className="w-10 h-10 text-slate-900" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Bienvenue sur Noubba</h1>
          <p className="text-slate-400 font-medium mb-10">Veuillez choisir votre espace pour continuer.</p>

          <div className="flex flex-col gap-4">
            <Link href="/client/login" className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 text-lg">
              <User className="w-6 h-6" /> Espace Client
            </Link>
            <Link href="/login" className="w-full h-16 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3 text-lg">
              <Store className="w-6 h-6 text-amber-400" /> Espace Coiffeur
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans selection:bg-amber-200 relative">
      
      {/* FLOATING WHATSAPP BUTTON */}
      <a 
        href="https://wa.me/212708794005?text=Bonjour,%20j'aimerais%20en%20savoir%20plus%20sur%20Noubba!" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/40 hover:scale-110 transition-transform z-50"
        title="Contactez-nous sur WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </a>

      {/* NAVBAR */}
      <nav className="absolute top-0 w-full px-4 sm:px-6 py-5 sm:py-6 flex justify-between items-center z-50 max-w-7xl mx-auto left-0 right-0 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900" />
          </div>
          <span className="font-black text-xl sm:text-2xl text-white tracking-tight">Noubba</span>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <Link href="/client/login" className="text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-colors whitespace-nowrap">
            <span className="hidden sm:inline">Espace </span>Client
          </Link>
          <Link href="/login" className="px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full transition-all shadow-lg active:scale-95 shrink-0">
            Connexion
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative pt-32 pb-0 lg:pt-40 lg:pb-0 px-6 bg-slate-900 overflow-hidden rounded-b-[3rem] shadow-2xl">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center mt-8">
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

          {/* PHONE MOCKUP */}
          <div className="mt-16 mx-auto w-full max-w-3xl relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="relative mx-auto w-64 sm:w-80 h-[250px] sm:h-[300px] bg-slate-800 border-[6px] border-slate-700 rounded-t-[3rem] shadow-2xl overflow-hidden translate-y-10 group hover:translate-y-6 transition-transform duration-500">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded-b-2xl z-20"></div>
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
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-900 to-transparent z-30"></div>
            </div>
          </div>
        </div>
      </div>

      {/* SOCIAL PROOF SECTION */}
      <div className="py-12 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Ils modernisent leurs salons avec nous</p>
          <div className="flex justify-center items-center gap-4 sm:gap-12 flex-wrap opacity-60 grayscale">
            <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Scissors className="w-6 h-6"/> Barber Shop Pro</div>
            <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Star className="w-6 h-6"/> The Gentlemen</div>
            <div className="flex items-center gap-2 font-black text-xl text-slate-800"><CheckCircle2 className="w-6 h-6"/> Cuts & Shaves</div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
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

      {/* DASHBOARD SHOWCASE */}
      <div className="py-20 px-6 bg-slate-900 text-white rounded-[3rem] max-w-6xl mx-auto mb-24 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-700">
              <LayoutDashboard className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-6 tracking-tight">Le contrôle total, <br/>du bout des doigts.</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Prévenez le client suivant d'un seul clic.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Ajoutez manuellement les clients sans smartphone.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">Fermez la file virtuelle d'attente à tout moment.</span>
              </li>
            </ul>
          </div>
          
          {/* CSS Tablet Mockup */}
          <div className="bg-slate-800 p-4 sm:p-6 rounded-3xl border border-slate-700 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <div className="font-black text-lg">Salon Dashboard</div>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">Ouvert</div>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-900">#1</div><span className="font-bold">Karim T.</span></div>
                <div className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-bold">Sur le fauteuil</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-600">
                <div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center font-black">#2</div><span className="font-bold">Youssef B.</span></div>
                <div className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold">Alerter (App)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="py-12 px-6 max-w-4xl mx-auto mb-24">
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <HelpCircle className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Questions Fréquentes</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">Le client doit-il télécharger une application ?</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Non ! Il scanne simplement le QR code et accède à sa file via son navigateur web classique (Chrome, Safari).</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">Comment j'obtiens mon QR Code ?</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Dès votre inscription, Noubba génère automatiquement une belle affiche avec votre QR Code, prête à être imprimée et collée au salon.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">Que faire des clients sans smartphone ?</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Vous disposez d'un bouton "Ajouter sur place" dans votre tableau de bord pour insérer manuellement le prénom de ces clients dans la file.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">Ai-je besoin d'une tablette spéciale ?</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Non, Noubba fonctionne sur n'importe quel appareil connecté à internet : iPad, tablette Android, ordinateur ou même votre smartphone personnel.</p>
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