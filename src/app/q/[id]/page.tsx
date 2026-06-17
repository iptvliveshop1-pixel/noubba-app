'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, MapPin, Clock, Users, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function SmartStorefront() {
  const params = useParams();
  const barberId = params.id as string;
  const router = useRouter();

  const [barber, setBarber] = useState<any>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchBarberAndAuth = async () => {
      // 1. Check if the customer is logged in
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      // 2. Fetch Barber Profile
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .single();

      if (barberError || !barberData) {
        toast.error("Ce salon n'existe pas ou le lien est invalide.", { icon: '❌' });
        setIsLoading(false);
        return;
      }
      setBarber(barberData);

      // 3. Fetch Current Queue Length
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barberId)
        .eq('status', 'waiting');

      setQueueLength(count || 0);
      setIsLoading(false);
    };

    if (barberId) fetchBarberAndAuth();
  }, [barberId]);

  const handleAction = async () => {
    // SCENARIO A: User is NOT logged in.
    if (!user) {
      // We save the barber ID in the phone's memory so we can auto-book them AFTER they sign up
      localStorage.setItem('pending_booking_barber_id', barberId);
      toast("Veuillez créer un compte pour prendre votre place.", { 
        icon: '👋', 
        style: { borderRadius: '12px', background: '#1e40af', color: '#fff' } 
      });
      router.push('/client/signup');
      return;
    }

    // SCENARIO B: User IS logged in. Book them instantly!
    setIsBooking(true);
    const toastId = toast.loading("Réservation en cours...", { style: { borderRadius: '12px' } });

    // Grab their customer details
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .single();

    // Insert them into the queue
    const { error } = await supabase.from('queue').insert([{
      barber_id: barberId,
      customer_id: user.id, 
      customer_name: customerData?.full_name || 'Client', 
      whatsapp_number: customerData?.phone_number || '', 
      status: 'waiting'
    }]);

    if (error) {
      toast.error("Erreur lors de la réservation.", { id: toastId });
      setIsBooking(false);
    } else {
      toast.success("Place réservée avec succès !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      router.push('/client/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">Salon introuvable</h1>
          <p className="text-slate-500 font-medium text-sm">Ce code QR n'est plus valide ou le salon n'existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-blue-200">
      
      {/* HEADER: BARBER PROFILE */}
      <div className="h-[40vh] w-full bg-slate-900 relative flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center mt-4">
          {barber.profile_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={barber.profile_image_url} alt={barber.shop_name} className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 shadow-xl mb-4" />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-xl mb-4">
              <span className="text-4xl font-black text-slate-900">{barber.shop_name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{barber.shop_name}</h1>
          <p className="text-slate-400 font-medium flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> {barber.location ? "Voir sur la carte" : "Maroc"}
          </p>
        </div>
      </div>

      {/* INFO CARDS */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        
        {/* Status Badge */}
        <div className="flex justify-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm border ${
            barber.is_open ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            <Clock className="w-4 h-4" /> 
            {barber.is_open ? 'Salon Ouvert' : 'Salon Fermé'}
          </div>
        </div>

        {/* Queue Length Card */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">File d'attente</p>
              <h3 className="text-xl font-black text-slate-900 leading-none">
                {queueLength} {queueLength > 1 ? 'personnes' : 'personne'}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Attente estimée</p>
            <h3 className="text-xl font-black text-blue-600 leading-none">
              ~{queueLength * 20} min
            </h3>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={handleAction} 
          disabled={!barber.is_open || isBooking} 
          className="w-full h-16 bg-blue-600 active:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all text-lg flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          {isBooking ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : !barber.is_open ? (
            "Fermé pour le moment"
          ) : user ? (
            <>Prendre ma place <ArrowRight className="w-5 h-5" /></>
          ) : (
            <>Se connecter pour réserver <LogIn className="w-5 h-5" /></>
          )}
        </button>
      </div>

    </div>
  );
}