'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LogOut, Scissors, MapPin, Timer, CheckCircle2, AlertCircle, X, Navigation, Store, QrCode, Camera, Clock, Star, Award } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function ClientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [activeQueue, setActiveQueue] = useState<any>(null);
  const [recentBarber, setRecentBarber] = useState<any>(null); 
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0); // ✨ NEW: Loyalty Points State
  const [position, setPosition] = useState<number>(0);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);
  
  // ✨ NEW: Review & Loyalty States
  const [unreviewedTicket, setUnreviewedTicket] = useState<any>(null);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isDelaying, setIsDelaying] = useState(false); 
  
  const [showScanner, setShowScanner] = useState(false);
  
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedAlertSound = useRef(false);
  
  const router = useRouter();
  const prevPosition = useRef<number>(0);

  const fetchDashboardData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/client/login');
      return;
    }
    setUser(session.user);

    const { data: customer } = await supabase.from('customers').select('*').eq('id', session.user.id).single();
    if (customer) setCustomerName(customer.full_name);

    // 1. Check for Active Queue
    const { data: queueDataArray, error: queueError } = await supabase
      .from('queue')
      .select(`
        *,
        queue_services(
          services(service_name, duration_minutes, price_dh)
        )
      `)
      .eq('customer_id', session.user.id)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: false })
      .limit(1);

    if (queueError) console.error("Dashboard Queue Fetch Error:", queueError);

    const queueData = queueDataArray?.[0] || null;

    if (queueData) {
      // ACTIVE QUEUE LOGIC
      setUnreviewedTicket(null); // Hide review modal if they are currently waiting

      const { data: barberData } = await supabase
        .from('barbers')
        .select('shop_name, location, profile_image_url')
        .eq('id', queueData.barber_id)
        .single();
        
      setActiveQueue({ ...queueData, barbers: barberData || { shop_name: 'Salon' } });
      
      const { data: aheadTickets } = await supabase
        .from('queue')
        .select('total_estimated_time')
        .eq('barber_id', queueData.barber_id)
        .eq('status', 'waiting')
        .lt('joined_at', queueData.joined_at);

      const currentPos = (aheadTickets?.length || 0) + 1;
      const calculatedWaitTime = aheadTickets?.reduce((sum, ticket) => sum + (ticket.total_estimated_time || 20), 0) || 0;
      setEstimatedWaitTime(calculatedWaitTime);
      
      if (prevPosition.current > 0 && currentPos < prevPosition.current) {
        toast.success("La file avance ! C'est bientôt à vous.", { 
          icon: '🚀', 
          style: { borderRadius: '12px', background: '#2563eb', color: '#fff' } 
        });
      }
      
      setPosition(currentPos);
      prevPosition.current = currentPos;

      if (queueData.alerted_at && !queueData.is_confirmed) {
        if (!hasPlayedAlertSound.current && soundEnabled && audioRef.current) {
          audioRef.current.play().catch(e => console.error("Audio blocked by browser:", e));
          hasPlayedAlertSound.current = true; 
        }
      } else {
        hasPlayedAlertSound.current = false;
      }

    } else {
      // NO ACTIVE QUEUE LOGIC
      setActiveQueue(null);
      setPosition(0);
      setEstimatedWaitTime(0);
      hasPlayedAlertSound.current = false;

      // ✨ NEW: Check for unreviewed completed tickets
      const { data: unreviewedData } = await supabase
        .from('queue')
        .select('*, barbers(id, shop_name, profile_image_url)')
        .eq('customer_id', session.user.id)
        .eq('status', 'completed')
        .eq('review_left', false)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (unreviewedData) {
        setUnreviewedTicket(unreviewedData);
      } else {
        setUnreviewedTicket(null);
      }

      // Fetch Recent Barber & Loyalty Points
      const { data: pastVisits } = await supabase
        .from('queue')
        .select('barber_id')
        .eq('customer_id', session.user.id)
        .order('joined_at', { ascending: false })
        .limit(1);

      if (pastVisits && pastVisits.length > 0) {
        const { data: bData } = await supabase
          .from('barbers')
          .select('id, shop_name, profile_image_url')
          .eq('id', pastVisits[0].barber_id)
          .single();
        setRecentBarber(bData);

        // Fetch Loyalty Points
        if (bData) {
          const { data: loyData } = await supabase
            .from('shop_loyalty')
            .select('points_balance')
            .eq('customer_id', session.user.id)
            .eq('barber_id', bData.id)
            .maybeSingle();
          setLoyaltyPoints(loyData?.points_balance || 0);
        }
      } else {
        setRecentBarber(null);
        setLoyaltyPoints(0);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('custom-queue-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        (payload) => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, soundEnabled]);

  // ✨ NEW: Submit Review and Award Loyalty Points
  const handleSubmitReview = async () => {
    if (!unreviewedTicket || ratingValue === 0) return;
    setIsSubmittingReview(true);
    const toastId = toast.loading("Envoi de votre avis...", { style: { borderRadius: '12px' }});

    // 1. Update ticket with rating and mark as reviewed
    await supabase
      .from('queue')
      .update({ rating: ratingValue, review_left: true })
      .eq('id', unreviewedTicket.id);

    // 2. Manage Loyalty Ledger
    const { data: loyaltyData } = await supabase
      .from('shop_loyalty')
      .select('*')
      .eq('customer_id', user.id)
      .eq('barber_id', unreviewedTicket.barber_id)
      .maybeSingle();

    if (loyaltyData) {
      await supabase
        .from('shop_loyalty')
        .update({ points_balance: (loyaltyData.points_balance || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', loyaltyData.id);
    } else {
      await supabase
        .from('shop_loyalty')
        .insert([{ 
          customer_id: user.id, 
          barber_id: unreviewedTicket.barber_id, 
          points_balance: 1 
        }]);
    }

    toast.success("Avis envoyé ! +1 Point de fidélité 🎁", { id: toastId, duration: 4000, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    setUnreviewedTicket(null);
    setRatingValue(0);
    setIsSubmittingReview(false);
    fetchDashboardData();
  };

  // ✨ NEW: Skip Review
  const handleSkipReview = async () => {
    if (!unreviewedTicket) return;
    await supabase.from('queue').update({ review_left: true }).eq('id', unreviewedTicket.id);
    setUnreviewedTicket(null);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/client/login');
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      if (user) {
        await supabase
          .from('customers')
          .update({ push_subscription: subscription })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  const handleJoinUsualBarber = async () => {
    if (!recentBarber) return;
    const toastId = toast.loading("Redirection vers le salon...");
    await subscribeToPush(); 
    toast.dismiss(toastId);
    router.push(`/q/${recentBarber.id}`);
  };

  const handleConfirmOnMyWay = async () => {
    if (!activeQueue) return;
    setIsConfirming(true);
    const toastId = toast.loading("Confirmation en cours...");

    const { error } = await supabase
      .from('queue')
      .update({ is_confirmed: true })
      .eq('id', activeQueue.id);

    if (!error) {
      toast.success("Le coiffeur est prévenu !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      setActiveQueue({ ...activeQueue, is_confirmed: true });
    } else {
      toast.error("Erreur réseau.", { id: toastId });
    }
    setIsConfirming(false);
  };

  const handleDelayTicket = async () => {
    if (!activeQueue || (activeQueue.delay_count || 0) >= 2) return;
    
    const confirm = window.confirm("Laisser passer la personne suivante ? Vous reculerez d'une place.");
    if (!confirm) return;

    setIsDelaying(true);
    const toastId = toast.loading("Mise à jour de votre place...", { style: { borderRadius: '12px' } });

    const { data: nextPerson } = await supabase
      .from('queue')
      .select('joined_at')
      .eq('barber_id', activeQueue.barber_id)
      .eq('status', 'waiting')
      .gt('joined_at', activeQueue.joined_at)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let newJoinedAt;
    if (nextPerson) {
      newJoinedAt = new Date(new Date(nextPerson.joined_at).getTime() + 1000).toISOString();
    } else {
      newJoinedAt = new Date(new Date(activeQueue.joined_at).getTime() + 15 * 60000).toISOString();
    }

    const { error } = await supabase
      .from('queue')
      .update({ 
        joined_at: newJoinedAt,
        delay_count: (activeQueue.delay_count || 0) + 1,
        alerted_at: null,
        is_confirmed: false 
      })
      .eq('id', activeQueue.id);

    if (!error) {
      toast.success("Vous avez laissé passer la personne suivante !", { id: toastId, icon: '⏱️', style: { borderRadius: '12px', background: '#f59e0b', color: '#fff' } });
      fetchDashboardData();
    } else {
      toast.error("Erreur lors de la modification.", { id: toastId });
    }
    setIsDelaying(false);
  };

  const handleCancelTicket = async () => {
    if (!activeQueue) return;
    const confirm = window.confirm("Êtes-vous sûr de vouloir quitter la file d'attente ?");
    if (!confirm) return;

    setIsCanceling(true);
    const { error } = await supabase
      .from('queue')
      .update({ status: 'cancelled' })
      .eq('id', activeQueue.id);

    if (!error) {
      toast("Vous avez quitté la file.", { icon: '👋' });
      setActiveQueue(null);
      fetchDashboardData();
    }
    setIsCanceling(false);
  };

  const handleScanSuccess = async (result: any) => {
    if (result && result.length > 0) {
      const url = result[0].rawValue;
      if (url.includes('/q/')) {
        setShowScanner(false);
        const toastId = toast.loading("Salon trouvé ! Ouverture...");
        await subscribeToPush(); 
        window.location.href = url;
      } else {
        toast.error("Ce QR Code n'est pas valide pour Noubba.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-blue-200">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      {/* ✨ NEW: RATING & LOYALTY MODAL */}
      {unreviewedTicket && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Coupe Terminée !</h2>
            <p className="text-slate-500 font-medium text-sm mb-6">
              Comment s'est passée votre visite chez <span className="font-bold text-slate-900">{unreviewedTicket.barbers?.shop_name}</span> ?
            </p>
            
            <div className="flex gap-2 mb-8">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRatingValue(star)}
                  className={`transition-all ${ratingValue >= star ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`}
                >
                  <Star className="w-10 h-10" fill={ratingValue >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>

            <button 
              onClick={handleSubmitReview}
              disabled={ratingValue === 0 || isSubmittingReview}
              className="w-full h-14 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
            >
              {isSubmittingReview ? "Envoi en cours..." : "Envoyer et gagner 1 point"}
            </button>
            
            <button 
              onClick={handleSkipReview}
              className="mt-5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Ignorer pour cette fois
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-6 bg-slate-900 text-white z-10 border-b border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-blue-400" />
              <h2 className="font-black text-xl tracking-tight">Scanner un Salon</h2>
            </div>
            <button onClick={() => setShowScanner(false)} className="bg-white/10 hover:bg-white/20 transition-colors p-2 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
            <Scanner 
              onScan={handleScanSuccess} 
              components={{ audio: false, finder: false } as any}
              styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
            />
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-blue-500 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl -translate-x-1 -translate-y-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl -translate-x-1 translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl translate-x-1 translate-y-1"></div>
              </div>
              <p className="text-white mt-8 font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Placez le QR Code dans le cadre</p>
            </div>
          </div>
        </div>
      )}

      <div className="h-[25vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-black"></div>
        <div className="absolute top-4 sm:top-6 w-full left-0 px-4 flex justify-between items-center z-20">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <button onClick={handleLogout} className="w-10 h-10 shrink-0 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="relative z-10 mt-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1">
            Bonjour, {customerName ? customerName.split(' ')[0] : 'Client'}
          </h1>
          <p className="text-blue-200 font-medium text-sm">Votre espace personnel Noubba</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 sm:px-6 pt-8 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        
        {!activeQueue ? (
          <>
            {recentBarber ? (
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center mt-4 relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-500">
                  <Store className="w-48 h-48" />
                </div>
                
                {recentBarber.profile_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={recentBarber.profile_image_url} alt="Salon" className="w-24 h-24 rounded-full object-cover border-4 border-amber-50 shadow-lg mx-auto mb-4" />
                ) : (
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-inner">
                    <Store className="w-8 h-8 text-amber-500" />
                  </div>
                )}
                
                <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Votre salon habituel</h3>
                <p className="text-sm text-slate-500 font-bold mb-4">{recentBarber.shop_name}</p>

                {/* ✨ NEW: Loyalty Points Display */}
                {loyaltyPoints > 0 && (
                  <div className="flex items-center justify-center mb-6">
                    <div className="bg-amber-100 text-amber-600 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5">
                      <Award className="w-4 h-4" /> {loyaltyPoints} point{loyaltyPoints > 1 ? 's' : ''} de fidélité
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleJoinUsualBarber}
                  className="w-full h-14 bg-slate-900 active:bg-slate-800 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-lg shadow-slate-900/20 text-lg flex items-center justify-center gap-2 mb-5 relative z-10"
                >
                  <Scissors className="w-5 h-5 text-amber-400" /> Prendre ma place
                </button>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 text-center mt-4 mb-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune file en cours</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">Prenez votre place rapidement !</p>
              </div>
            )}
            
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Nouveau salon ?</h3>
              <p className="text-sm text-slate-500 font-medium mb-5">Scannez le code du coiffeur pour rejoindre sa file d'attente.</p>
              <button 
                onClick={() => setShowScanner(true)}
                className="w-full h-14 bg-blue-600 active:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-600/30 text-lg flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5 text-blue-200" /> Scanner un QR Code
              </button>
            </div>
          </>
        ) : (
          <div className={`rounded-[2rem] p-1 shadow-lg transition-colors duration-500 ${
            activeQueue.alerted_at && !activeQueue.is_confirmed 
              ? 'bg-gradient-to-b from-orange-400 to-orange-500 shadow-orange-500/20' 
              : activeQueue.is_confirmed
                ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-emerald-500/20'
                : 'bg-gradient-to-b from-blue-600 to-blue-800 shadow-blue-600/20'
          }`}>
            <div className="bg-white rounded-[1.8rem] p-6 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none">
                <Scissors className="w-48 h-48" />
              </div>

              {activeQueue.alerted_at && !activeQueue.is_confirmed && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-bold">C'est bientôt à vous ! Confirmez votre arrivée ci-dessous.</p>
                </div>
              )}

              <div className="text-center border-b border-slate-100 pb-6 mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Votre Position</h2>
                
                <div className="flex justify-center items-center h-24 overflow-hidden my-2">
                  <span 
                    key={position} 
                    className="text-7xl font-black text-slate-900 tracking-tighter animate-in slide-in-from-top-8 fade-in duration-500"
                  >
                    #{position}
                  </span>
                </div>
                
                {estimatedWaitTime > 0 && position > 1 && !activeQueue.alerted_at && (
                  <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full w-fit mx-auto font-bold text-sm mt-2 animate-in fade-in duration-700">
                    <Timer className="w-4 h-4" /> Attente estimée : ~{estimatedWaitTime} min
                  </div>
                )}
                
                {position === 2 && (
                  <div className="mt-3">
                    <p className="text-emerald-600 font-bold flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                      <CheckCircle2 className="w-4 h-4" /> Vous êtes le prochain !
                    </p>
                  </div>
                )}

                {position === 1 && !activeQueue.alerted_at && (
                  <div className="bg-amber-50 text-amber-600 border border-amber-200 px-4 py-2 rounded-full inline-flex items-center justify-center gap-2 mt-3 font-black animate-in zoom-in-95">
                    <Scissors className="w-4 h-4" /> C'est votre tour !
                  </div>
                )}
              </div>

              {activeQueue.queue_services && activeQueue.queue_services.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 relative z-10">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Prestations choisies</h3>
                  <div className="space-y-2">
                    {activeQueue.queue_services.map((qs: any, i: number) => qs.services && (
                      <div key={i} className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">{qs.services.service_name}</span>
                        <span className="font-medium text-slate-500 text-sm">{qs.services.price_dh} DH</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-black text-slate-900">Total estimé</span>
                    <span className="font-black text-amber-600 text-lg">
                      {activeQueue.queue_services.reduce((total: number, qs: any) => total + (qs.services?.price_dh || 0), 0)} DH
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-8">
                {activeQueue.barbers?.profile_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={activeQueue.barbers.profile_image_url} alt="Salon" className="w-14 h-14 rounded-xl object-cover shadow-sm border border-slate-100 shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Scissors className="w-6 h-6 text-slate-600" />
                  </div>
                )}
                
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">{activeQueue.barbers?.shop_name}</h3>
                  {activeQueue.barbers?.location && (
                    <a 
                      href={activeQueue.barbers.location} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 text-sm font-bold flex items-center gap-1.5 mt-1 transition-colors w-fit group"
                    >
                      <MapPin className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> 
                      <span className="underline underline-offset-4">Voir sur la carte</span>
                    </a>
                  )}
                </div>
              </div>

              {activeQueue.alerted_at && !activeQueue.is_confirmed ? (
                <button 
                  onClick={handleConfirmOnMyWay}
                  disabled={isConfirming}
                  className="w-full h-14 bg-orange-500 active:bg-orange-600 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-500/30 text-lg flex items-center justify-center gap-2 mb-3 relative z-10"
                >
                  <Navigation className="w-5 h-5" /> Je suis en route !
                </button>
              ) : activeQueue.is_confirmed ? (
                <div className="w-full h-14 bg-emerald-50 text-emerald-600 font-black rounded-xl border-2 border-emerald-200 flex items-center justify-center gap-2 mb-3 relative z-10">
                  <CheckCircle2 className="w-5 h-5" /> Coiffeur prévenu
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 relative z-10">
                {(activeQueue.delay_count || 0) < 2 ? (
                  <>
                    <button 
                      onClick={handleDelayTicket}
                      disabled={isDelaying || isCanceling || isConfirming}
                      className="h-12 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" /> Retard ({2 - (activeQueue.delay_count || 0)})
                    </button>
                    <button 
                      onClick={handleCancelTicket}
                      disabled={isCanceling || isDelaying || isConfirming}
                      className="h-12 bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Annuler
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleCancelTicket}
                    disabled={isCanceling || isDelaying || isConfirming}
                    className="col-span-2 h-12 bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Annuler ma place
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}