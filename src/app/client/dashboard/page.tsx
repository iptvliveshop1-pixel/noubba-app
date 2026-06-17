'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LogOut, Scissors, MapPin, Clock, Timer, CheckCircle2, AlertCircle, X, Navigation, BellRing } from 'lucide-react';

export default function ClientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [activeQueue, setActiveQueue] = useState<any>(null);
  const [position, setPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  
  // NEW: Audio State
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

    const { data: queueDataArray, error: queueError } = await supabase
      .from('queue')
      .select('*')
      .eq('customer_id', session.user.id)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: false })
      .limit(1);

    if (queueError) console.error("Dashboard Queue Fetch Error:", queueError);

    const queueData = queueDataArray?.[0] || null;

    if (queueData) {
      const { data: barberData } = await supabase
        .from('barbers')
        .select('shop_name, location')
        .eq('id', queueData.barber_id)
        .single();
        
      setActiveQueue({ ...queueData, barbers: barberData || { shop_name: 'Salon' } });
      
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', queueData.barber_id)
        .eq('status', 'waiting')
        .lte('joined_at', queueData.joined_at);

      const currentPos = count || 1;
      
      if (prevPosition.current > 0 && currentPos < prevPosition.current) {
        toast.success("La file avance ! C'est bientôt à vous.", { 
          icon: '🚀', 
          style: { borderRadius: '12px', background: '#2563eb', color: '#fff' } 
        });
      }
      
      setPosition(currentPos);
      prevPosition.current = currentPos;

      // ✨ NEW: The Audio Trigger Logic
      if (queueData.alerted_at && !queueData.is_confirmed) {
        // If the barber alerted them, and we haven't played the sound yet
        if (!hasPlayedAlertSound.current && soundEnabled && audioRef.current) {
          audioRef.current.play().catch(e => console.error("Audio blocked by browser:", e));
          hasPlayedAlertSound.current = true; // Prevent the sound from looping every 5 seconds
        }
      } else {
        // Reset the trigger if they aren't alerted yet
        hasPlayedAlertSound.current = false;
      }

    } else {
      setActiveQueue(null);
      setPosition(0);
      hasPlayedAlertSound.current = false;
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000); // Checks the database every 5 seconds for updates
    return () => clearInterval(interval);
  }, [user, soundEnabled]); // Added soundEnabled to dependency array

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/client/login');
  };

  // ✨ NEW: Function to legally unlock the browser's audio engine
  const enableSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause(); // Play and immediately pause to unlock the API
      audioRef.current.currentTime = 0;
    }
    setSoundEnabled(true);
    toast.success("Alertes sonores activées !", { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
  };

  const handleConfirmOnMyWay = async () => {
    if (!activeQueue) return;
    setIsConfirming(true);
    const toastId = toast.loading("Confirmation en cours...");

    // This updates the new is_confirmed column we just added to the database!
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
    }
    setIsCanceling(false);
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
      
      {/* Hidden Audio Player using your local ding.mp3 file */}
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

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
        
        {/* ✨ NEW: The Sound Unlock Banner */}
        {!soundEnabled && activeQueue && (
          <div 
            onClick={enableSound}
            className="bg-blue-600 text-white p-4 rounded-2xl mb-6 shadow-lg shadow-blue-600/20 cursor-pointer flex justify-between items-center transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-sm">Activer les alertes</p>
                <p className="text-blue-200 text-xs font-medium mt-0.5">Pour être prévenu quand c'est votre tour</p>
              </div>
            </div>
          </div>
        )}

        {!activeQueue ? (
          <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 text-center mt-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Timer className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune file en cours</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">Scannez le QR Code de votre coiffeur préféré pour prendre votre place.</p>
          </div>
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
                
                {position > 1 && (
                  <p className="text-slate-500 font-medium flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" /> Attente estimée: <strong className="text-slate-900">~{(position - 1) * 20} min</strong>
                  </p>
                )}
                {position === 1 && !activeQueue.alerted_at && (
                  <p className="text-emerald-600 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Vous êtes le prochain !
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <Scissors className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">{activeQueue.barbers?.shop_name}</h3>
                  {activeQueue.barbers?.location && (
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> Voir sur la carte
                    </p>
                  )}
                </div>
              </div>

              {/* ✨ NEW: The On My Way Button is now perfectly tied to the database */}
              {activeQueue.alerted_at && !activeQueue.is_confirmed ? (
                <button 
                  onClick={handleConfirmOnMyWay}
                  disabled={isConfirming}
                  className="w-full h-14 bg-orange-500 active:bg-orange-600 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-500/30 text-lg flex items-center justify-center gap-2 mb-3"
                >
                  <Navigation className="w-5 h-5" /> Je suis en route !
                </button>
              ) : activeQueue.is_confirmed ? (
                <div className="w-full h-14 bg-emerald-50 text-emerald-600 font-black rounded-xl border-2 border-emerald-200 flex items-center justify-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5" /> Coiffeur prévenu
                </div>
              ) : null}

              <button 
                onClick={handleCancelTicket}
                disabled={isCanceling}
                className="w-full h-12 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-500 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Annuler ma place
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}