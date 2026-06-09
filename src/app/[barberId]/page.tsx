'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { toast } from 'react-hot-toast'; 
import { CheckCircle2, Users, Check, Scissors, Clock, MapPin } from 'lucide-react';

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

  useEffect(() => {
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

    if (rawBarberId) {
      fetchBarberAndQueue();
    }
  }, [rawBarberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const cleanNumber = whatsappNumber.replace(/\s+/g, '');
    
    if (cleanNumber.length < 10) {
      toast.error("Veuillez entrer un numéro valide (10 chiffres).", {
        style: { borderRadius: '12px', background: '#333', color: '#fff' }
      }); 
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
      toast.error("Erreur lors de l'inscription.", {
        style: { borderRadius: '12px', background: '#333', color: '#fff' }
      }); 
      console.error(error);
    } else {
      setIsSuccess(true);
    }
    setIsSubmitting(false);
  };

  if (errorMsg && !barberData) {
    return (
       <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center p-4">
         <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-red-100/50 text-center shadow-[0_20px_60px_-15px_rgba(220,38,38,0.1)]">
           <p className="text-red-500 font-medium text-lg tracking-tight">{errorMsg}</p>
         </div>
       </div>
    );
  }

  if (!barberData) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 font-sans pb-12">
        <div className="w-full max-w-md bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 sm:p-10 animate-pulse">
          <div className="h-8 bg-slate-200/50 rounded-lg w-1/3 mx-auto mb-4"></div>
          <div className="h-5 bg-slate-200/50 rounded-lg w-1/2 mx-auto mb-6"></div>
          <div className="h-10 bg-slate-200/50 rounded-full w-2/3 mx-auto mb-10"></div>
          <div className="space-y-6">
            <div>
              <div className="h-4 bg-slate-200/50 rounded w-24 mb-2"></div>
              <div className="h-14 bg-slate-100/50 rounded-2xl w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-slate-200/50 rounded w-32 mb-2"></div>
              <div className="h-14 bg-slate-100/50 rounded-2xl w-full"></div>
            </div>
            <div className="h-16 bg-slate-200/50 rounded-2xl w-full mt-8"></div>
          </div>
        </div>
      </div>
    );
  }

  // THE LOCKED DOOR (Upgraded with Custom Image & Raw Google Map Link)
  if (barberData.is_open === false) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-10 text-center">
          
          {barberData.profile_image_url ? (
            <div className="w-24 h-24 mx-auto mb-5 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barberData.profile_image_url} alt={barberData.shop_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Scissors className="w-10 h-10 text-amber-400" />
            </div>
          )}
          
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{barberData.shop_name}</h1>
          <p className="text-amber-600 font-bold uppercase tracking-widest text-sm mt-2 mb-4">{barberData.owner_name}</p>

          {/* ✨ UPGRADED: Using raw Google Maps Link */}
          {barberData.location && (
            <a 
              href={barberData.location.startsWith('http') ? barberData.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barberData.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors mb-8 shadow-sm"
            >
              <MapPin className="w-4 h-4 text-amber-500" />
              Voir sur la carte
            </a>
          )}

          {/* Status Card */}
          <div className="bg-slate-900 rounded-2xl p-6 mb-8 text-white">
            <Clock className="w-10 h-10 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Salon Fermé</h2>
            <p className="text-slate-400 font-medium">Nous sommes actuellement fermés. Revenez plus tard pour prendre votre place !</p>
          </div>
          
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Propulsé par Noubba</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 text-center shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] transform transition-all animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white flex items-center justify-center rounded-full mx-auto mb-8 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Vous y êtes !</h2>
          <p className="text-slate-500 leading-relaxed text-lg">
            <strong className="text-slate-900 font-bold">{barberData.shop_name}</strong> vous enverra un message sur WhatsApp dès que ce sera votre tour.
          </p>
        </div>
      </div>
    );
  }

  return (
     <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 font-sans pb-12 sm:p-6">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 sm:p-10 relative overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 opacity-90"></div>

        <div className="text-center mb-10 mt-2">
          
          {/* Dynamic Profile Photo */}
          {barberData.profile_image_url ? (
            <div className="w-24 h-24 mx-auto mb-5 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={barberData.profile_image_url} alt={barberData.shop_name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-900/10">
              <Scissors className="w-8 h-8 text-amber-400" />
            </div>
          )}

          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">{barberData.shop_name}</h1>
          <h2 className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1 opacity-90 mb-4">{barberData.owner_name}</h2>
          
          {/* ✨ UPGRADED: Using raw Google Maps Link */}
          {barberData.location && (
            <a 
              href={barberData.location.startsWith('http') ? barberData.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barberData.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors mb-2 shadow-sm"
            >
              <MapPin className="w-4 h-4 text-amber-500" />
              Voir sur la carte
            </a>
          )}

          <div className="mt-6 inline-flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-100 rounded-full shadow-sm">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-sm text-slate-600 font-semibold">{queueLength} personne(s) en attente</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between px-1">
              <label className="text-sm font-bold text-slate-700">Votre Nom</label>
              <label className="text-sm font-bold text-slate-700" dir="rtl">الإسم</label>
            </div>
            <input 
              type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} 
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base" 
              placeholder="Ex: Youssef" 
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between px-1">
              <label className="text-sm font-bold text-slate-700">Numéro WhatsApp</label>
              <label className="text-sm font-bold text-slate-700" dir="rtl">رقم الواتساب</label>
            </div>
            <input 
              type="tel" required value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} 
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base font-mono" 
              placeholder="06 94 64 54 15" 
            />
          </div>

          <button 
            type="submit" disabled={isSubmitting} 
            className="w-full mt-10 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold py-4.5 rounded-2xl transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.4)] active:scale-[0.98] disabled:opacity-70 text-lg flex justify-center items-center gap-2.5 h-16"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Connexion...</span>
            ) : (
              <><Check className="w-6 h-6 text-amber-400" /> Prendre ma place / شد نوبتك</>
            )}
          </button>
        </form>
        
        <div className="mt-10 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Propulsé par Noubba</p>
        </div>
      </div>
    </div>
  );
}