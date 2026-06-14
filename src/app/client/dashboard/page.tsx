'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MapPin, Navigation, CheckCircle2, Clock, LogOut, Scissors, Ticket } from 'lucide-react';

export default function ClientDashboard() {
  const [customer, setCustomer] = useState<any>(null);
  const [myQueue, setMyQueue] = useState<any>(null);
  const [position, setPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // MAGIC UX: Track if the phone has vibrated yet for this alert
  const hasVibrated = useRef(false);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 seconds for real-time tracking
    const interval = setInterval(() => fetchDashboardData(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // HAPTIC FEEDBACK LOGIC
  useEffect(() => {
    if (myQueue?.alerted_at && !myQueue?.is_confirmed && !hasVibrated.current) {
      // Trigger a distinct vibration pattern (if supported by the device)
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      hasVibrated.current = true;
    }
    
    // Reset vibration lock if the queue is cleared
    if (!myQueue) {
      hasVibrated.current = false;
    }
  }, [myQueue?.alerted_at, myQueue?.is_confirmed, myQueue]);

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/client/signup');
      return;
    }

    // Get Customer Profile
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setCustomer(customerData);

    // Get their ACTIVE queue status
    const { data: queueData } = await supabase
      .from('queue')
      .select('*, barbers(shop_name)')
      .eq('customer_id', user.id)
      .eq('status', 'waiting')
      .maybeSingle(); 

    if (queueData) {
      setMyQueue(queueData);
      
      // Calculate exactly how many people are ahead of them
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', queueData.barber_id)
        .eq('status', 'waiting')
        .lt('created_at', queueData.created_at); 
        
      setPosition((count || 0) + 1);
    } else {
      setMyQueue(null);
    }
    
    if (showLoading) setIsLoading(false);
  };

  const handleConfirmOnMyWay = async () => {
    const toastId = toast.loading("Confirmation en cours...");
    
    const { error } = await supabase
      .from('queue')
      .update({ is_confirmed: true })
      .eq('id', myQueue.id);

    if (error) {
      toast.error("Erreur de confirmation.", { id: toastId });
    } else {
      toast.success("Le coiffeur est prévenu !", { id: toastId });
      fetchDashboardData(false); // Silent refresh
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/client/signup');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans pb-24 selection:bg-blue-200">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Scissors className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-black text-slate-900 tracking-tight">Noubba</span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full active:scale-95">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 py-8 max-w-md mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">
          Bonjour, {customer?.full_name?.split(' ')[0]} 👋
        </h1>
        
        {!myQueue ? (
          /* NO ACTIVE QUEUE STATE */
          <div className="mt-8 bg-white border border-slate-200 rounded-[2rem] p-8 text-center shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-md transition-shadow">
            <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-100">
              <Ticket className="w-8 h-8 text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Aucun ticket actif</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Vous n'êtes dans aucune file d'attente pour le moment.</p>
            <div className="bg-blue-50 border border-blue-100/50 rounded-2xl p-5 inline-block w-full">
              <p className="text-blue-800 text-sm font-bold">
                Scannez le QR Code de votre salon pour prendre votre place en un clic !
              </p>
            </div>
          </div>
        ) : (
          /* ACTIVE QUEUE STATE - APPLE WALLET TICKET DESIGN */
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* THE TICKET */}
            <div className="relative bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-800">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              {/* Top Half of Ticket */}
              <div className="p-6 relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-wider bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                    <MapPin className="w-3.5 h-3.5" />
                    {myQueue.barbers?.shop_name || "Salon de coiffure"}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Scissors className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
                
                <p className="text-slate-400 text-sm font-medium mb-1">Votre position actuelle</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-black text-white tracking-tighter leading-none">#{position}</span>
                  <span className="text-slate-500 font-bold text-lg">en attente</span>
                </div>
              </div>

              {/* The Cutout Dashed Line (Magic CSS trick) */}
              <div className="relative flex items-center justify-between px-0">
                {/* Left Hole (Matches page background) */}
                <div className="w-8 h-8 rounded-full bg-slate-50 -ml-4 z-20 shadow-inner"></div>
                {/* Dashed Line */}
                <div className="flex-1 border-t-2 border-dashed border-slate-700"></div>
                {/* Right Hole (Matches page background) */}
                <div className="w-8 h-8 rounded-full bg-slate-50 -mr-4 z-20 shadow-inner"></div>
              </div>

              {/* Bottom Half of Ticket */}
              <div className="p-6 bg-slate-800/30 relative z-10 backdrop-blur-md">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Statut de la file</span>
                  {position === 1 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4" /> Bientôt votre tour
                    </span>
                  ) : (
                    <span className="text-blue-400 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Dans la file
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* THE UBER METHOD LOGIC */}
            {myQueue.alerted_at && !myQueue.is_confirmed && (
              <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-600/20 animate-in fade-in slide-in-from-bottom-4 duration-500 border border-blue-500 mt-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <h3 className="text-xl font-black">C'est presque votre tour !</h3>
                  </div>
                  <p className="text-blue-100 text-sm mb-6 font-medium">
                    Le coiffeur vous attend. Veuillez confirmer que vous êtes en route pour conserver votre place.
                  </p>
                  <button 
                    onClick={handleConfirmOnMyWay}
                    className="w-full h-14 bg-white text-blue-600 font-black rounded-2xl flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                  >
                    <Navigation className="w-5 h-5" />
                    Je suis en route
                  </button>
                </div>
              </div>
            )}

            {myQueue.alerted_at && myQueue.is_confirmed && (
              <div className="bg-emerald-50 border-2 border-emerald-500/20 rounded-[2rem] p-6 flex items-center gap-5 animate-in zoom-in-95 duration-300 mt-2">
                <div className="w-14 h-14 bg-emerald-100 rounded-[1.2rem] flex items-center justify-center shrink-0 border border-emerald-200">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-900 mb-0.5 tracking-tight">En route !</h3>
                  <p className="text-sm font-medium text-emerald-700">Le coiffeur sait que vous arrivez.</p>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}