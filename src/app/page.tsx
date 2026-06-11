'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, Zap, MessageSquare, LayoutDashboard, Check, QrCode, Download, ArrowRight } from 'lucide-react';
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

    // ✨ MAGIC: Check phone memory for a saved barber!
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-200">
      <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg"><Scissors className="w-5 h-5 text-amber-400" /></div>
            NOUBBA
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {(installPrompt || isIOS) && (
              <button onClick={handleInstallClick} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl transition-all border border-amber-200 shadow-sm">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Installer l'App</span>
              </button>
            )}
            <Link href="/login" className="hidden sm:block px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Se connecter</Link>
            <Link href="/signup" className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-900/20">Créer un compte</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
        
        {/* ✨ MAGIC: The VIP Returning Customer Banner */}
        {savedBarber && (
          <div className="mb-12 max-w-md mx-auto bg-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-amber-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-4">De retour ?</h3>
            <div className="flex items-center gap-4 mb-5">
              {savedBarber.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={savedBarber.image} alt={savedBarber.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm" />
              ) : (
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center"><Scissors className="w-6 h-6 text-slate-400" /></div>
              )}
              <div className="text-left">
                <p className="text-lg font-extrabold text-slate-900">{savedBarber.name}</p>
                <p className="text-sm text-slate-500 font-medium">Votre salon favori</p>
              </div>
            </div>
            <Link href={`/${savedBarber.id}`} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
              Reprendre ma place <ArrowRight className="w-4 h-4 text-amber-400" />
            </Link>
          </div>
        )}

        {!savedBarber && (
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-amber-100 bg-amber-50 text-amber-700 text-sm font-bold shadow-sm">
            <Zap className="w-4 h-4 fill-amber-500" /> 🚀 Le 1er système de file d'attente WhatsApp au Maroc
          </div>
        )}
        
        <h1 className="text-6xl md:text-8xl font-extrabold text-slate-900 mb-8 tracking-tighter leading-[0.9]">
          Fini l'attente <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400">au salon.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
          Transformez votre salon avec une file d'attente intelligente. Vos clients prennent leur tour sur mobile et reçoivent un message WhatsApp automatique.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/signup" className="group w-full sm:w-auto px-8 py-5 bg-amber-600 hover:bg-amber-700 text-white text-lg font-bold rounded-2xl transition-all shadow-[0_10px_30px_-10px_rgba(217,119,6,0.5)] active:scale-[0.98] flex items-center justify-center gap-2">
            Je suis un Barbier
          </Link>
          <Link href="/tarik" className="w-full sm:w-auto px-8 py-5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-lg font-bold rounded-2xl transition-all active:scale-[0.98] shadow-sm flex items-center justify-center">
            Voir une Démo
          </Link>
        </div>
      </main>

      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white text-amber-600 flex items-center justify-center rounded-2xl mb-6 shadow-sm border border-slate-100"><QrCode className="w-7 h-7" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. Scan QR Code</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Le client scanne le code dans votre salon pour rejoindre la file instantanément.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white text-amber-600 flex items-center justify-center rounded-2xl mb-6 shadow-sm border border-slate-100"><MessageSquare className="w-7 h-7" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. Alertes WhatsApp</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Le système envoie automatiquement un message quand son tour approche.</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-white text-amber-600 flex items-center justify-center rounded-2xl mb-6 shadow-sm border border-slate-100"><LayoutDashboard className="w-7 h-7" /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. Dashboard Simple</h3>
              <p className="text-slate-500 leading-relaxed font-medium">Gérez votre file d'attente en un clic depuis votre téléphone.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 text-center">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Rentabilité immédiate</h2>
        <p className="text-slate-500 mb-16 font-medium">Un prix simple pour les barbiers ambitieux.</p>
        <div className="max-w-sm mx-auto bg-slate-900 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <h3 className="text-2xl font-bold text-white mb-2">Abonnement Pro</h3>
          <div className="flex justify-center items-baseline gap-2 mb-8">
            <span className="text-6xl font-black text-white">5$</span><span className="text-slate-400 font-bold">/ mois</span>
          </div>
          <ul className="text-left space-y-4 mb-10 text-slate-300 font-medium">
            {['File d\'attente illimitée', 'WhatsApp automatisé', 'Lien personnalisé', 'Support 24/7'].map(item => (
              <li key={item} className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> {item}</li>
            ))}
          </ul>
          <Link href="/signup" className="block w-full py-5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98]">
            S'inscrire maintenant
          </Link>
        </div>
      </section>

      <footer className="py-12 text-center text-slate-400 text-sm font-medium">
        © 2026 Noubba. Conçu avec passion pour les barbiers du Maroc.
      </footer>
    </div>
  );
}