'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MapPin, Clock, ArrowRight, Store, Scissors, CheckCircle2, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const barberId = params.id as string;

  const [barber, setBarber] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [alreadyInQueue, setAlreadyInQueue] = useState(false);

  useEffect(() => {
    if (barberId) {
      fetchData();
    }
  }, [barberId]);

  const fetchData = async () => {
    // 1. Fetch Barber Info from the URL ID
    const { data: bData, error: bError } = await supabase
      .from('barbers')
      .select('*')
      .eq('id', barberId)
      .single();

    if (bError || !bData) {
      toast.error("Salon introuvable.");
      setIsLoading(false);
      return;
    }
    setBarber(bData);

    // 2. Check if the Customer is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: cData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (cData) {
        setCustomer(cData);

        // 3. Check if they are already in a queue
        const { data: qData } = await supabase
          .from('queue')
          .select('*')
          .eq('customer_id', user.id)
          .eq('status', 'waiting')
          .single();
        
        if (qData) {
          setAlreadyInQueue(true);
        }
      }
    }
    setIsLoading(false);
  };

  const handleJoinQueue = async () => {
    // If they aren't logged in, redirect them to create an account
    if (!customer) {
      toast("Créez un compte rapidement pour prendre votre place !", { icon: '👋' });
      router.push('/client/signup');
      return;
    }

    // If they are already in the queue, just send them to their dashboard
    if (alreadyInQueue) {
      router.push('/client/dashboard');
      return;
    }

    // Join the Queue!
    setIsJoining(true);
    const toastId = toast.loading("Réservation de votre place...");

    const { error } = await supabase.from('queue').insert([{
      barber_id: barberId,
      customer_id: customer.id,
      customer_name: customer.full_name,
      // We keep the DB column name 'whatsapp_number' so backend logic doesn't break
      whatsapp_number: customer.phone_number, 
      status: 'waiting'
    }]);

    if (error) {
      toast.error("Erreur lors de la réservation.", { id: toastId });
      setIsJoining(false);
    } else {
      toast.success("Place confirmée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      router.push('/client/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-black text-slate-900 mb-2">Salon introuvable</h1>
        <p className="text-slate-500 mb-8">Ce QR Code ne semble pas valide ou le salon n'existe plus.</p>
        <Link href="/" className="bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      
      {/* Dynamic Header Section */}
      <div className="h-[40vh] w-full bg-slate-900 relative flex flex-col justify-end px-6 pb-12 overflow-hidden">
        {/* Background Image Setup */}
        {barber.profile_image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={barber.profile_image_url} alt="Salon" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-slate-900 to-black"></div>
        )}

        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-4 shadow-xl">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-2">
            {barber.shop_name}
          </h1>
          <p className="text-slate-300 font-medium flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-400" />
            Espace Coiffeur {barber.owner_name ? `• ${barber.owner_name.split(' ')[0]}` : ''}
          </p>
        </div>
      </div>

      {/* Action Card Section */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-6 relative z-20 px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        
        {/* Greeting block */}
        {customer && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-blue-700 font-black">{customer.full_name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Connecté</p>
              <p className="text-sm font-bold text-slate-900 leading-tight">Content de vous revoir, {customer.full_name.split(' ')[0]} !</p>
            </div>
          </div>
        )}

        {/* Shop Status block */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${barber.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="font-bold text-slate-900">{barber.is_open ? 'Salon Ouvert' : 'Salon Fermé'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-slate-600">
              <Clock className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-sm font-medium">Rejoignez la file virtuelle, suivez votre position en direct, et soyez alerté quand c'est votre tour.</p>
            </div>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        {barber.is_open ? (
          <button 
            onClick={handleJoinQueue}
            disabled={isJoining}
            className={`w-full h-16 font-black rounded-2xl transition-all text-lg flex items-center justify-center gap-3 shadow-lg ${
              alreadyInQueue 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 active:scale-[0.98]'
            }`}
          >
            {isJoining ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : alreadyInQueue ? (
              <><CheckCircle2 className="w-6 h-6" /> Voir ma position</>
            ) : !customer ? (
              <><UserPlus className="w-6 h-6" /> Créer un compte</>
            ) : (
              <>Prendre ma place <ArrowRight className="w-6 h-6" /></>
            )}
          </button>
        ) : (
          <div className="w-full h-16 bg-slate-200 text-slate-500 font-black rounded-2xl flex items-center justify-center gap-2">
            Salon fermé pour le moment
          </div>
        )}
      </div>

    </div>
  );
}