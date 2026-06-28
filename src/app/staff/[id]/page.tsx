'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  User, KeyRound, Scissors, Check, UserX, Snowflake, 
  Timer, Bell, CheckCircle2, ChevronLeft, LogOut, Loader2 
} from 'lucide-react';

type Customer = {
  id: string;
  customer_id?: string;
  customer_name: string;
  whatsapp_number: string;
  alerted_at?: string;
  is_confirmed?: boolean;
  status?: string;
  frozen_at?: string; 
  delay_count?: number; // ✨ THIS IS THE MISSING PIECE
  queue_services?: {
    services?: {
      service_name: string;
      duration_minutes: number;
    }
  }[];
};

type StaffMember = {
  id: string;
  name: string;
  access_pin: string;
  is_available: boolean;
};

export default function StaffPortal() {
  const { id: shopId } = useParams();
  const router = useRouter();

  // Navigation states
  const [shopName, setShopName] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffMember | null>(null);
  
  // PIN Pad state
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Live Queue states
  const [queue, setQueue] = useState<Customer[]>([]);
  const [frozenQueue, setFrozenQueue] = useState<Customer[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});

  const queueRef = useRef<Customer[]>([]);
  const confirmedIds = useRef<Set<string>>(new Set());

  // Format countdown clock
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Fetch initial configuration data (Shop & Staff Profiles)
  useEffect(() => {
    if (!shopId) return;

    const fetchShopAndStaff = async () => {
      // Get shop identity
      const { data: shop } = await supabase
        .from('barbers')
        .select('shop_name')
        .eq('id', shopId)
        .single();
      if (shop) setShopName(shop.shop_name);

      // Get active workers matching this shop's ID
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('barber_id', shopId)
        .order('name', { ascending: true });
      if (staffData) setStaffList(staffData);
    };

    fetchShopAndStaff();
  }, [shopId]);

  // 2. Continuous real-time countdown tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] -= 1;
            if (next[id] === 0) {
              handleAutoPenalty(id);
            }
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Keep specific chair queue synced up every 5 seconds when authorized
  useEffect(() => {
    if (!authenticatedStaff) return;
    
    fetchChairQueue();
    const interval = setInterval(fetchChairQueue, 5000);
    return () => clearInterval(interval);
  }, [authenticatedStaff]);

  const fetchChairQueue = async () => {
    if (!authenticatedStaff) return;

    const { data, error } = await supabase
      .from('queue')
      .select(`
        *,
        queue_services (
          services (service_name, duration_minutes)
        )
      `)
      .eq('staff_id', authenticatedStaff.id)
      .in('status', ['waiting', 'frozen'])
      .order('joined_at', { ascending: true });

    if (!error && data) {
      const activeClients = data.filter(c => c.status === 'waiting');
      const frozenClients = data.filter(c => c.status === 'frozen');
      
      let playSound = false;
      activeClients.forEach(client => {
        if (client.is_confirmed && !confirmedIds.current.has(client.id)) {
          playSound = true;
          confirmedIds.current.add(client.id);
        }

        if (client.alerted_at && !client.is_confirmed && !timers[client.id]) {
          const elapsed = Math.floor((new Date().getTime() - new Date(client.alerted_at).getTime()) / 1000);
          const remaining = Math.max(0, 600 - elapsed);
          setTimers(prev => ({ ...prev, [client.id]: remaining }));
        }
      });

      if (playSound) {
        new Audio('/ding.mp3').play().catch(e => console.log("Audio blocked:", e));
      }

      setQueue(activeClients);
      setFrozenQueue(frozenClients);
      queueRef.current = activeClients;
    }
  };

  const handleAutoPenalty = async (id: string) => {
    const target = queueRef.current.find(c => c.id === id);
    if (!target) return;

    const newJoinedAt = new Date(new Date().getTime() + 15 * 60000).toISOString();
    await supabase.from('queue').update({
      joined_at: newJoinedAt,
      alerted_at: null,
      is_confirmed: false,
      delay_count: (target.delay_count || 0) + 1
    }).eq('id', id);

    toast.error(`${target.customer_name} est en retard. Relégué !`);
    fetchChairQueue();
  };

  // Keyboard handlers for custom PIN pad
  const handleKeyPress = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // Verify PIN entries locally matching data definitions
  useEffect(() => {
    if (pin.length === 4 && selectedStaff) {
      verifyPin();
    }
  }, [pin]);

  const verifyPin = () => {
    if (!selectedStaff) return;
    setIsVerifying(true);

    if (selectedStaff.access_pin === pin) {
      toast.success(`Session ouverte : ${selectedStaff.name}`, { icon: '🔓' });
      setAuthenticatedStaff(selectedStaff);
    } else {
      toast.error('Code PIN incorrect. Réessayez.');
      setPin('');
    }
    setIsVerifying(false);
  };

  // Queue manipulation handlers
  const handleComplete = async (customerId: string) => {
    const { error } = await supabase.from('queue').update({ status: 'completed' }).eq('id', customerId);
    if (!error) {
      toast.success('Coupe terminée ! ✨');
      fetchChairQueue();
    }
  };

  const handleFreeze = async (customerId: string) => {
    const { error } = await supabase.from('queue').update({ 
      status: 'frozen',
      alerted_at: null,
      is_confirmed: false 
    }).eq('id', customerId);
    if (!error) {
      toast.success('Client mis en pause');
      fetchChairQueue();
    }
  };

  const handleUnfreeze = async (customerId: string) => {
    const { error } = await supabase.from('queue').update({ status: 'waiting' }).eq('id', customerId);
    if (!error) {
      toast.success('Client réactivé !');
      fetchChairQueue();
    }
  };

  const handleManualNotify = async (customer: Customer) => {
    setIsSendingAlert(customer.id);
    try {
      const { error } = await supabase.from('queue').update({ alerted_at: new Date().toISOString() }).eq('id', customer.id);
      if (error) throw error;

      setTimers(prev => ({ ...prev, [customer.id]: 600 }));

      if (customer.customer_id) {
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customer.customer_id,
            title: "C'est votre tour ! ✂️",
            body: `Votre coiffeur est prêt. Confirmez pour maintenir votre place !`
          })
        }).catch(err => console.error(err));
      }

      toast.success('Notification envoyée !');
      fetchChairQueue();
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setIsSendingAlert(null);
    }
  };

  // SCREEN 1: Profile Selection Screen
  if (!selectedStaff) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col justify-center px-6 py-12">
        <div className="max-w-md w-full mx-auto text-center space-y-8">
          <div>
            <span className="text-amber-500 font-bold text-xs uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Portail d'Équipe
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight mt-4">{shopName || 'Chargement...'}</h1>
            <p className="text-slate-400 font-medium text-sm mt-1">Sélectionnez votre profil pour accéder à votre fauteuil.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {staffList.filter(s => s.is_available).map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedStaff(member)}
                className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-[0.98] group"
              >
                <div className="w-12 h-12 bg-slate-900 group-hover:bg-amber-500/10 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-white font-black text-base tracking-tight truncate max-w-full">{member.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: Secure PIN Access Pad
  if (selectedStaff && !authenticatedStaff) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col justify-between px-6 py-8">
        <div className="max-w-sm w-full mx-auto text-center pt-8 space-y-6">
          <button 
            onClick={() => { setSelectedStaff(null); setPin(''); }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-bold mx-auto bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Retour aux profils
          </button>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Code PIN de {selectedStaff.name}</h2>
            <p className="text-slate-400 text-xs font-medium mt-1">Saisissez vos 4 chiffres de sécurité</p>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-4 py-4">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pin.length > idx 
                    ? 'bg-amber-500 border-amber-500 scale-110 shadow-lg shadow-amber-500/20' 
                    : 'bg-transparent border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Custom Touch Grid Keypad */}
        <div className="max-w-xs w-full mx-auto pb-8 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                disabled={isVerifying}
                className="h-16 bg-slate-800 active:bg-slate-700 border border-slate-700/40 rounded-2xl text-xl font-black text-white transition-colors flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <div className="h-16" /> {/* Empty spacing slot */}
            <button
              onClick={() => handleKeyPress('0')}
              disabled={isVerifying}
              className="h-16 bg-slate-800 active:bg-slate-700 border border-slate-700/40 rounded-2xl text-xl font-black text-white transition-colors flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={isVerifying}
              className="h-16 bg-slate-800/50 active:bg-slate-800 text-sm font-bold text-slate-400 active:text-white rounded-2xl flex items-center justify-center transition-colors"
            >
              Effacer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 3: Core Functional Workspace Layout (Authenticated Worker Mode)
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      
      {/* Dynamic Dedicated Header UI Banner */}
      <div className="h-[20vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        <div className="absolute top-4 w-full left-0 px-4 flex justify-between items-center z-20">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black tracking-wider px-3 py-1 rounded-full backdrop-blur-md">
            Session : {authenticatedStaff?.name}
          </span>
          <button 
            onClick={() => { setAuthenticatedStaff(null); setSelectedStaff(null); setPin(''); }}
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 active:scale-95 transition-all backdrop-blur-md"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 mt-4">
          <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Votre Fauteuil</h1>
          <p className="text-slate-400 font-medium text-xs truncate">{shopName}</p>
        </div>
      </div>

      {/* Primary Scrollable Workspace Wrapper View */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 pt-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-y-auto">
        {queue.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-sm space-y-3">
            <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Scissors className="w-5 h-5" />
            </div>
            <p>Aucun client dans votre file d'attente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((customer, index) => {
              const isAlerted = !!customer.alerted_at;
              const isConfirmed = customer.is_confirmed;
              const timeRemaining = timers[customer.id] || 0;

              // CURRENT CUSTOMER UNDER PROGRESS
              if (index === 0) {
                return (
                  <div key={customer.id} className="p-5 rounded-[1.75rem] bg-slate-900 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 opacity-[0.04] pointer-events-none">
                      <Scissors className="w-40 h-40" />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                          <Scissors className="w-5 h-5 text-slate-900" />
                        </div>
                        <div>
                          <span className="text-amber-400 font-bold text-[10px] uppercase tracking-widest block">Sur votre fauteuil</span>
                          <h3 className="text-xl font-black text-white capitalize leading-tight">{customer.customer_name}</h3>
                          <span className="text-slate-400 font-mono text-xs mt-0.5 block">{customer.whatsapp_number}</span>
                        </div>
                      </div>
                    </div>

                    {customer.queue_services && customer.queue_services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 relative z-10">
                        {customer.queue_services.map((qs, i) => qs.services && (
                          <span key={i} className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            {qs.services.service_name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 w-full mt-5 relative z-10">
                      <button onClick={() => handleComplete(customer.id)} className="flex-1 h-12 bg-emerald-500 active:bg-emerald-400 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
                        <Check className="w-4 h-4" /> Marquer Terminer
                      </button>
                      <button onClick={() => handleFreeze(customer.id)} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              // NEXT UP WAITING CUSTOMERS
              return (
                <div 
                  key={customer.id} 
                  className={`p-4 rounded-[1.5rem] border flex flex-col gap-3 transition-all ${
                    isConfirmed 
                      ? 'bg-emerald-50/40 border-emerald-300' 
                      : isAlerted 
                        ? 'bg-orange-50/40 border-orange-200' 
                        : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm border ${
                        isConfirmed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : isAlerted ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 capitalize leading-tight">{customer.customer_name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-slate-500 font-mono text-[11px]">{customer.whatsapp_number}</span>
                          {isConfirmed && (
                            <span className="flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> En route
                            </span>
                          )}
                          {isAlerted && !isConfirmed && (
                            <span className="flex items-center text-[9px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full animate-pulse">
                              <Timer className="w-2.5 h-2.5 mr-0.5" /> Attente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {customer.whatsapp_number !== 'Sur place' && !isConfirmed && (
                      <div className="col-span-2">
                        {isAlerted ? (
                          <div className={`w-full h-10 font-black rounded-xl text-xs flex items-center justify-center gap-2 text-white ${timeRemaining > 0 ? 'bg-orange-500' : 'bg-red-500'}`}>
                            <Timer className="w-4 h-4" /> {timeRemaining > 0 ? formatTime(timeRemaining) : "Relégation..."}
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleManualNotify(customer)} 
                            disabled={isSendingAlert === customer.id}
                            className="w-full h-10 flex items-center justify-center gap-2 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                          >
                            {isSendingAlert === customer.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <><Bell className="w-3.5 h-3.5 text-amber-400" /> Appeler le client (SMS/Push)</>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    
                    <button onClick={() => handleComplete(customer.id)} className="h-10 flex items-center justify-center gap-1.5 font-bold rounded-xl text-xs bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                      <Check className="w-3.5 h-3.5" /> Terminé
                    </button>
                    <button onClick={() => handleFreeze(customer.id)} className="h-10 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs border border-blue-100/60">
                      <Snowflake className="w-3.5 h-3.5" /> Mettre Pause
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FROZEN CUSTOMERS LIST HOLDING BOX */}
        {frozenQueue.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-3 px-1 text-slate-500 font-bold text-xs uppercase tracking-wider">
              <Snowflake className="w-3.5 h-3.5 text-blue-500" />
              Clients en pause
            </div>
            <div className="space-y-2">
              {frozenQueue.map(customer => (
                <div key={customer.id} className="bg-white p-3 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 capitalize">{customer.customer_name}</span>
                  <button 
                    onClick={() => handleUnfreeze(customer.id)} 
                    className="h-8 px-3 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs transition-colors"
                  >
                    Réactiver
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}