'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast'; 
import { CheckCircle2, Check, Scissors, Clock, MapPin, Download, Ticket } from 'lucide-react';

export default function CustomerCheckIn() {
  const params = useParams();
  const rawBarberId = params.barberId as string; 

  const [barberData, setBarberData] = useState<any>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [myPosition, setMyPosition] = useState<number>(0);
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setIsIOS(true);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const savedIdentity = localStorage.getItem('noubba_user_identity');
    if (savedIdentity) {
      try {
        const parsed = JSON.parse(savedIdentity);
        if (parsed.name) setCustomerName(parsed.name);
        if (parsed.phone) setWhatsappNumber(parsed.phone);
      } catch (e) {}
    }

    const fetchBarberAndQueue = async () => {
      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('*')
        .ilike('owner_name', rawBarberId.replace(/-/g, ' ')) 
        .single();

      if (barberError || !barber) {
        setErrorMsg("Ce salon n'existe pas ou le lien est invalide.");
        return;
      }

      setBarberData(barber);

      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barber.id)
        .eq('status', 'waiting');

      setQueueLength(count || 0);
    };

    if (rawBarberId) fetchBarberAndQueue();
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [rawBarberId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const cleanNumber = whatsappNumber.replace(/\s+/g, '');
    
    if (cleanNumber.length < 10) {
      toast.error("Veuillez entrer un numéro valide (10 chiffres).", { style: { borderRadius: '12px', background: '#333', color: '#fff' }}); 
      setIsSubmitting(false);
      return;
    }

    if (!barberData) return;

    const { error } = await supabase.from('queue').insert([{
      barber_id: barberData.id, 
      customer_name: customerName,
      whatsapp_number: whatsappNumber,
      status: 'waiting'
    }]);

    if (error) {
      toast.error("Erreur lors de l'inscription.", { style: { borderRadius: '12px', background: '#333', color: '#fff' }}); 
    } else {
      setMyPosition(queueLength + 1);
      setIsSuccess(true);
      
      localStorage.setItem('noubba_saved_barber', JSON.stringify({
        id: rawBarberId,
        name: barberData.shop_name,
        image: barberData.profile_image_url
      }));

      localStorage.setItem('noubba_user_identity', JSON.stringify({
        name: customerName,
        phone: whatsappNumber
      }));
    }
    setIsSubmitting(false);
  };

  if (errorMsg && !barberData) return <div className="min-h-screen bg-white flex items-center justify-center p-6"><p className="text-red-500 font-bold text-center">{errorMsg}</p></div>;
  
  if (!barberData) return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <div className="h-64 bg-slate-200 animate-pulse w-full"></div>
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 z-10 p-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse w-2/3 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded animate-pulse w-1/3 mb-12"></div>
        <div className="h-20 bg-slate-100 rounded-2xl animate-pulse w-full mb-4"></div>
        <div className="h-20 bg-slate-100 rounded-2xl animate-pulse w-full"></div>
      </div>
    </div>
  );

  // --- CLOSED STATE ---
  if (barberData.is_open === false) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
        <div className="h-[40vh] w-full relative bg-slate-900">
          {barberData.profile_image_url ? (
            <img src={barberData.profile_image_url} alt="Salon" className="w-full h-full object-cover opacity-50 grayscale" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Scissors className="w-16 h-16 text-slate-700" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent"></div>
        </div>
        <div className="flex-1 bg-slate-50 rounded-t-3xl -mt-8 relative z-10 px-6 pt-10 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{barberData.shop_name}</h1>
          <p className="text-slate-500 font-medium mt-2 mb-8">est actuellement fermé</p>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <p className="text-slate-600 font-medium leading-relaxed">Revenez plus tard ou pendant les heures d'ouverture pour prendre votre place dans la file d'attente.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- SUCCESS STATE ---
  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <div className="w-24 h-24 bg-emerald-500 text-white flex items-center justify-center rounded-full mx-auto mb-8 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] transform animate-in zoom-in duration-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight text-center">Vous y êtes !</h2>
          <p className="text-slate-500 text-lg text-center mb-10">Vous recevrez un message WhatsApp dès que ce sera votre tour.</p>
          
          <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center gap-2">
            <Ticket className="w-8 h-8 text-emerald-500 mb-2" />
            <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">Votre Position</span>
            <span className="text-6xl font-black text-slate-900">#{myPosition}</span>
          </div>
        </div>

        {/* Sticky Install Button */}
        {(installPrompt || isIOS) && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50 pb-8">
            <button onClick={handleInstallClick} className="w-full h-16 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-3">
              <Download className="w-6 h-6" /> Installer l'App
            </button>
            <p className="text-center text-xs text-slate-400 mt-4 font-medium">Pour un accès en 1 clic la prochaine fois</p>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN BOOKING APP SCREEN (UBER/AIRBNB STYLE) ---
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      
      {/* Hero Image (Edge to Edge) */}
      <div className="h-[35vh] relative w-full bg-slate-900">
        {barberData.profile_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={barberData.profile_image_url} alt={barberData.shop_name} className="w-full h-full object-cover opacity-90" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Scissors className="w-16 h-16 text-slate-700" /></div>
        )}
        {/* Soft fade into the content block */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>
      </div>

      {/* Main Content Card (Overlaps the image) */}
      <div className="flex-1 bg-slate-50 rounded-t-3xl -mt-6 relative z-10 px-6 pt-6 pb-40">
        
        {/* Header Info */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{barberData.shop_name}</h1>
            <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider">{barberData.owner_name}</p>
          </div>
          <div className="bg-white shadow-sm border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-slate-700 font-bold text-sm">{queueLength} en attente</span>
          </div>
        </div>

        {barberData.location && (
          <a href={barberData.location.startsWith('http') ? barberData.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barberData.location)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-amber-600 font-bold mb-8 active:opacity-70 transition-opacity">
            <MapPin className="w-5 h-5" /> Voir sur Google Maps
          </a>
        )}

        <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
          
          {/* Native-style Input Container 1 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm">
            <div className="flex justify-between w-full mb-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Votre Nom</label>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider" dir="rtl">الإسم</label>
            </div>
            <input 
              type="text" 
              required 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
              className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
              placeholder="Ex: Youssef" 
            />
          </div>

          {/* Native-style Input Container 2 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm">
            <div className="flex justify-between w-full mb-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</label>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider" dir="rtl">الواتساب</label>
            </div>
            <input 
              type="tel" 
              required 
              value={whatsappNumber} 
              onChange={(e) => setWhatsappNumber(e.target.value)} 
              className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
              placeholder="06 00 00 00 00" 
            />
          </div>

        </form>
      </div>

      {/* Sticky Bottom Action Bar (The Uber Confirm Button) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button 
          type="submit" 
          form="booking-form"
          disabled={isSubmitting} 
          className="w-full h-16 bg-slate-900 active:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-colors text-lg flex justify-center items-center gap-2"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </span>
          ) : (
            <>Prendre ma place <span className="text-slate-400 mx-1">•</span> شد نوبتك</>
          )}
        </button>
      </div>

    </div>
  );
}