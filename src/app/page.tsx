'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Scissors, QrCode, ArrowRight, Timer, CheckCircle2, Smartphone, User, Store, MessageCircle, LayoutDashboard, HelpCircle, Star, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';

const translations = {
  fr: {
    clientSpace: "Espace Client",
    login: "Connexion",
    heroTitlePrefix: "La nouvelle ère des salons de",
    heroTitleAccent: "coiffure.",
    heroSubtitle: "Gérez votre file d'attente sur tablette, laissez vos clients suivre leur position en temps réel sur leur téléphone. 100% digital.",
    createShopBtn: "Créer mon Salon",
    installAppBtn: "Installer l'App Client",
    socialProof: "Ils modernisent leurs salons avec nous",
    howItWorksTitle: "Comment ça marche ?",
    howItWorksSubtitle: "Une expérience premium qui respecte le temps de vos clients et optimise l'organisation de votre salon.",
    step1Title: "1. Scan & Réservation",
    step1Desc: "Le client scanne le QR Code affiché dans votre salon ou vitrine et prend sa place virtuellement en un clic.",
    step2Title: "2. Suivi en Direct",
    step2Desc: "Fini l'attente sur les canapés. Le client suit sa position exacte en temps réel depuis son smartphone.",
    step3Title: "3. Alerte & Écran TV",
    step3Desc: "Alertez le client quand c'est son tour et affichez les fauteuils en direct sur votre télévision de salon.",
    dashboardTitle: "Le contrôle total, du bout des doigts.",
    bullet1: "Prévenez le client suivant d'un seul clic ou via WhatsApp.",
    bullet2: "Ajoutez manuellement les clients sans smartphone.",
    bullet3: "Mode Écran TV en direct pour votre salon.",
    faqTitle: "Questions Fréquentes",
    q1: "Le client doit-il télécharger une application ?",
    a1: "Non ! Il scanne simplement le QR code et accède à sa file via son navigateur web classique (Chrome, Safari).",
    q2: "Comment j'obtiens mon QR Code ?",
    a2: "Dès votre inscription, Noubba génère automatiquement une belle affiche avec votre QR Code, prête à être imprimée et collée au salon.",
    q3: "Que faire des clients sans smartphone ?",
    a3: "Vous disposez d'un bouton 'Ajouter sur place' dans votre tableau de bord pour insérer manuellement le prénom de ces clients dans la file.",
    q4: "Ai-je besoin d'une tablette spéciale ?",
    a4: "Non, Noubba fonctionne sur n'importe quel appareil connecté à internet : iPad, tablette Android, ordinateur ou smartphone.",
    ctaTitle: "Prêt à moderniser votre salon ?",
    ctaSubtitle: "Rejoignez les barbiers qui ont choisi Noubba pour offrir une expérience premium à leurs clients.",
    ctaBtn: "Créer mon compte",
    footerText: "Conçu pour les salons et barbiers modernes."
  },
  en: {
    clientSpace: "Client Portal",
    login: "Log in",
    heroTitlePrefix: "The new digital era for",
    heroTitleAccent: "barbershops.",
    heroSubtitle: "Manage your queue on a tablet, let your clients follow their spot in real time on their smartphone. 100% digital.",
    createShopBtn: "Create My Salon",
    installAppBtn: "Install Client App",
    socialProof: "Modernizing salons and barbershops every day",
    howItWorksTitle: "How does it work?",
    howItWorksSubtitle: "A premium experience that respects your clients' time and streamlines your shop's operations.",
    step1Title: "1. Scan & Join",
    step1Desc: "Clients scan your salon's QR code on the window or counter and take their spot in one tap.",
    step2Title: "2. Live Queue Tracking",
    step2Desc: "No more waiting on crowded couches. Clients monitor their real-time turn on their own phone.",
    step3Title: "3. Turn Alerts & TV Mode",
    step3Desc: "Notify clients when their chair is ready and project live queue progress directly onto your shop's TV.",
    dashboardTitle: "Total control at your fingertips.",
    bullet1: "Alert the next client in one tap or via WhatsApp.",
    bullet2: "Manually add walk-in clients who don't have smartphones.",
    bullet3: "Live TV Screen mode for your waiting area.",
    faqTitle: "Frequently Asked Questions",
    q1: "Do clients have to download an app?",
    a1: "No! They simply scan the QR code and access their ticket via their standard web browser (Chrome, Safari).",
    q2: "How do I get my QR code poster?",
    a2: "As soon as you sign up, Noubba generates a clean, printable QR poster ready to display in your shop.",
    q3: "What about walk-in clients without smartphones?",
    a3: "You have a fast 'Add Walk-in' button in your dashboard to insert any client directly into a chair.",
    q4: "Do I need special hardware?",
    a4: "No, Noubba runs smoothly on any internet-connected device: iPad, Android tablet, laptop, or phone.",
    ctaTitle: "Ready to modernize your salon?",
    ctaSubtitle: "Join barbers and salons who use Noubba to deliver a first-class customer experience.",
    ctaBtn: "Get Started Free",
    footerText: "Designed for modern barbers and salons."
  }
};

export default function Home() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = translations[lang];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isStandaloneUnauth, setIsStandaloneUnauth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('noubba_lang');
    if (saved === 'en' || saved === 'fr') setLang(saved);

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

  const toggleLanguage = () => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('noubba_lang', next);
  };

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
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
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
              <User className="w-6 h-6" /> {t.clientSpace}
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
      
      {/* FLOATING WHATSAPP SUPPORT BUTTON */}
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
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-1.5"
            title="Changer de langue / Switch language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono uppercase">{lang === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</span>
          </button>

          <Link href="/client/login" className="text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-colors whitespace-nowrap">
            {t.clientSpace}
          </Link>
          <Link href="/login" className="px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-full transition-all shadow-lg active:scale-95 shrink-0">
            {t.login}
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative pt-32 pb-0 lg:pt-40 lg:pb-0 px-6 bg-slate-900 overflow-hidden rounded-b-[3rem] shadow-2xl">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center mt-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {t.heroTitlePrefix} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">{t.heroTitleAccent}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            {t.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] text-lg">
              {t.createShopBtn} <ArrowRight className="w-5 h-5" />
            </Link>
            <button onClick={handleAppDownload} className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all backdrop-blur-md border border-white/10 active:scale-95 text-lg">
              <Smartphone className="w-5 h-5" /> {t.installAppBtn}
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
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{t.socialProof}</p>
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
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">{t.howItWorksTitle}</h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">{t.howItWorksSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-slate-100 hover:border-amber-200 transition-all duration-300 group hover:-translate-y-2">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300">
              <QrCode className="w-7 h-7 text-amber-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">{t.step1Title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{t.step1Desc}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-slate-100 hover:border-blue-200 transition-all duration-300 group hover:-translate-y-2">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
              <Timer className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">{t.step2Title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{t.step2Desc}</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-slate-100 hover:border-emerald-200 transition-all duration-300 group hover:-translate-y-2">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-300">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">{t.step3Title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{t.step3Desc}</p>
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
            <h2 className="text-3xl sm:text-4xl font-black mb-6 tracking-tight">{t.dashboardTitle}</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">{t.bullet1}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">{t.bullet2}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="text-slate-300 font-medium">{t.bullet3}</span>
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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.faqTitle}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">{t.q1}</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t.a1}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">{t.q2}</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t.a2}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">{t.q3}</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t.a3}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h4 className="font-black text-slate-900 mb-2">{t.q4}</h4>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t.a4}</p>
          </div>
        </div>
      </div>

      {/* CTA SECTION */}
      <div className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900 to-black"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">{t.ctaTitle}</h2>
            <p className="text-slate-400 font-medium mb-8 max-w-lg mx-auto">{t.ctaSubtitle}</p>
            <Link href="/signup" className="inline-flex px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl items-center justify-center gap-2 transition-all active:scale-95 text-lg shadow-[0_0_30px_-10px_rgba(245,158,11,0.5)]">
              {t.ctaBtn} <ArrowRight className="w-5 h-5" />
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
        <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} Noubba. {t.footerText}</p>
      </footer>

    </div>
  );
}