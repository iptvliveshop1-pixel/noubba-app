'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, Zap, MessageSquare, LayoutDashboard, QrCode, Download, ArrowRight, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [savedBarber, setSavedBarber] = useState<{ id: string, name: string, image: string | null } | null>(null);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setIsIOS(true);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const stored = localStorage.getItem('noubba_saved_barber');
    if (stored) {
      try {
        setSavedBarber(JSON.parse(stored));
      } catch (e) {}
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else if (isIOS) {
      toast("Sur iPhone : Appuyez sur l'icône Partager ⬆️ au milieu en bas, puis sur « Sur l'écran d'accueil ».", {
        icon: '📱', duration: 6000, style: { borderRadius: '12px', background: '#333', color: '#fff' }
      });
    } else {
      toast.success("L'application est déjà installée !", { style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
      
      {/* NATIVE HERO SECTION (Edge to Edge) */}
      <div className="h-[45vh] w-full bg-slate-900 relative flex flex-col items-center justify-center overflow-hidden">
        {/* Deep premium gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>

        {/* Floating Top Bar */}
        <div className="absolute top-0 w-full px-6 py-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <div className="bg-amber-400 p-1.5 rounded-xl"><Scissors className="w-5 h-5 text-slate-900" /></div>
            <span className="text-white font-black tracking-tight text-xl">NOUBBA</span>
          </div>
          <Link href="/login" className="text-slate-300 font-bold text-sm bg-white/10 px-5 py-2.5 rounded-full backdrop-blur-md active:bg-white/20 transition-colors">
            Connexion
          </Link>
        </div>

        <div className="relative z-10 text-center px-6 mt-4">
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tighter leading-[1.1] mb-4">
            Fini l'attente <br/> <span className="text-amber-400">au salon.</span>
          </h1>
          <p className="text-slate-400 font-medium text-lg">Le 1er système de file d'attente WhatsApp au Maroc.</p>
        </div>
      </div>

      {/* OVERLAPPING BOTTOM SHEET */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">

        {/* NATIVE VIP CARD (Like Apple Wallet) */}
        {savedBarber && (
          <div className="mb-8 bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200/60 transform transition-all active:scale-[0.98]">
            <div className="flex justify-between items-center mb-5">
              <span className="text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-full">De retour ?</span>
            </div>
            <div className="flex items-center gap-4 mb-6">
              {savedBarber.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={savedBarber.image} alt={savedBarber.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100" />
              ) : (
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center"><Scissors className="w-6 h-6 text-slate-400" /></div>
              )}
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{savedBarber.name}</h3>
                <p className="text-slate-500 font-medium text-sm">Votre salon favori</p>
              </div>
            </div>
            <Link href={`/${savedBarber.id}`} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md active:bg-slate-800 transition-colors">
              Reprendre ma place <ArrowRight className="w-5 h-5 text-amber-400" />
            </Link>
          </div>
        )}

        {/* PWA INSTALL CARD */}
        {(installPrompt || isIOS) && (
          <button onClick={handleInstallClick} className="w-full mb-8 bg-amber-50 border border-amber-200/60 rounded-[2rem] p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Installer l'application</h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5">Accès rapide depuis l'écran d'accueil</p>
            </div>
          </button>
        )}

        {/* NATIVE FEATURE GRID (For Barbers) */}
        <div className="mt-2">
          <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Pour les Barbiers</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <QrCode className="w-8 h-8 text-amber-500 mb-4" />
              <div>
                <h4 className="font-black text-slate-900 text-sm mb-1 tracking-tight">Scan QR</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Les clients scannent pour rejoindre la file.</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <Smartphone className="w-8 h-8 text-amber-500 mb-4" />
              <div>
                <h4 className="font-black text-slate-900 text-sm mb-1 tracking-tight">WhatsApp</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Alertes auto avant leur tour.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM BAR (Barber Sign Up) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <Link href="/signup" className="w-full h-16 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-2xl transition-colors text-lg flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20">
          Créer mon espace <span className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg ml-1 font-bold">5$/mois</span>
        </Link>
      </div>

    </div>
  );
}