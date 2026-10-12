'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  User, MessageCircle, Scissors, Check, UserX, Snowflake, 
  Timer, Bell, CheckCircle2, ChevronLeft, LogOut, Loader2, UserPlus, X, Circle
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
  joined_at?: string;
  delay_count?: number;
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
  is_available: boolean;
};

export default function StaffPortal() {
  const { id: shopId } = useParams();
  const router = useRouter();

  const [shopName, setShopName] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<any[]>([]); 
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffMember | null>(null);
  
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [queue, setQueue] = useState<Customer[]>([]);
  const [frozenQueue, setFrozenQueue] = useState<Customer[]>([]);
  const [isSendingAlert, setIsSendingAlert] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isAddingWalkIn, setIsAddingWalkIn] = useState(false);

  const queueRef = useRef<Customer[]>([]);
  const confirmedIds = useRef<Set<string>>(new Set());

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!shopId) return;
    const fetchShopData = async () => {
      const { data: shop } = await supabase.from('barbers').select('shop_name').eq('id', shopId).single();
      if (shop) setShopName(shop.shop_name);

      // Secure query: Only select id, name, is_available (Never access_pin)
      const { data: staffData } = await supabase.from('staff').select('id, name, is_available').eq('barber_id', shopId).order('name', { ascending: true });
      if (staffData) setStaffList(staffData);

      const { data: servicesData } = await supabase.from('services').select('*').eq('barber_id', shopId).order('price_dh', { ascending: true });
      if (servicesData) setServices(servicesData);
    };
    fetchShopData();
  }, [shopId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] -= 1;
            if (next[id] === 0) handleAutoPenalty(id);
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!authenticatedStaff) return;
    fetchChairQueue();
    const interval = setInterval(fetchChairQueue, 5000);
    return () => clearInterval(interval);
  }, [authenticatedStaff]);

  const autoNotify = async (customer: Customer) => {
    try {
      await supabase.from('queue').update({ alerted_at: new Date().toISOString() }).eq('id', customer.id);
      setTimers(prev => ({ ...prev, [customer.id]: 600 }));
      if (customer.customer_id) {
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customer.customer_id,
            title: "C'est bientôt à vous ! ✂️",
            body: `Le fauteuil de ${authenticatedStaff?.name} vous attend.`
          })
        }).catch(e => console.error(e));
      }
      toast(`Alerte auto envoyée à ${customer.customer_name}`, { icon: '🤖' });
    } catch (e) {
      console.error(e);
    }
  };

  const triggerSlidingWindow = async (currentQueue: Customer[]) => {
    const clientsToAnalyze = currentQueue.slice(0, 2); 
    for (const client of clientsToAnalyze) {
      if (!client.alerted_at && !client.is_confirmed && client.whatsapp_number !== 'Sur place') {
        await autoNotify(client);
      }
    }
  };

  const fetchChairQueue = async () => {
    if (!authenticatedStaff) return;
    const { data, error } = await supabase
      .from('queue')
      .select(`*, queue_services (services (service_name, duration_minutes))`)
      .eq('staff_id', authenticatedStaff.id)
      .in('status', ['waiting', 'frozen'])
      .order('joined_at', { ascending: true });

    if (!error && data) {
      const activeClients = data.filter(c => c.status === 'waiting');
      const frozenClients = data.filter(c => c.status === 'frozen');
      
      activeClients.forEach(client => {
        if (client.is_confirmed && !confirmedIds.current.has(client.id)) {
          confirmedIds.current.add(client.id);
          new Audio('/ding.mp3').play().catch(e => console.log("Audio blocked"));
        }
        if (client.alerted_at && !client.is_confirmed && !timers[client.id]) {
          const elapsed = Math.floor((new Date().getTime() - new Date(client.alerted_at).getTime()) / 1000);
          let remaining = 600 - elapsed;
          remaining = Math.max(0, Math.min(600, remaining)); 
          setTimers(prev => ({ ...prev, [client.id]: remaining }));
        }
      });
      setQueue(activeClients);
      setFrozenQueue(frozenClients);
      queueRef.current = activeClients;

      if (activeClients.length > 0) {
        triggerSlidingWindow(activeClients as Customer[]);
      }
    }
  };

  const handleAutoPenalty = async (id: string) => {
    const target = queueRef.current.find(c => c.id === id);
    if (!target) return;
    
    const strikes = target.delay_count || 0;

    if (strikes >= 2) {
      await supabase.from('queue').update({ status: 'cancelled' }).eq('id', id);
      toast.error(`${target.customer_name} a ignoré 3 alertes. Retiré de la file !`);
    } else if (strikes === 1) {
      await supabase.from('queue').update({
        joined_at: new Date().toISOString(),
        alerted_at: null,
        is_confirmed: false,
        delay_count: 2
      }).eq('id', id);
      toast.error(`${target.customer_name} relégué à la fin de la file !`);
    } else {
      const newJoinedAt = new Date(new Date().getTime() + 15 * 60000).toISOString();
      await supabase.from('queue').update({
        joined_at: newJoinedAt,
        alerted_at: null,
        is_confirmed: false,
        delay_count: 1
      }).eq('id', id);
      toast.error(`${target.customer_name} est en retard. Place reculée.`);
    }
    
    fetchChairQueue();
  };

  const handleKeyPress = (num: string) => { if (pin.length < 4) setPin(prev => prev + num); };
  const handleBackspace = () => setPin(prev => prev.slice(0, -1));

  // Server-side PIN verification
  useEffect(() => {
    if (pin.length === 4 && selectedStaff) {
      const verifyPin = async () => {
        setIsVerifying(true);
        try {
          const res = await fetch('/api/staff/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: selectedStaff.id, pin }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setAuthenticatedStaff(selectedStaff);
          } else {
            toast.error(data.error || 'PIN incorrect.');
            setPin('');
          }
        } catch {
          toast.error('Erreur de connexion.');
          setPin('');
        } finally {
          setIsVerifying(false);
        }
      };
      verifyPin();
    }
  }, [pin, selectedStaff]);

  const handleComplete = async (customerId: string) => {
    await supabase.from('queue').update({ status: 'completed' }).eq('id', customerId);
    toast.success('Coupe terminée ! ✨');
    fetchChairQueue();
  };

  const handleFreeze = async (customerId: string) => {
    await supabase.from('queue').update({ 
      status: 'frozen',
      alerted_at: null,
      is_confirmed: false 
    }).eq('id', customerId);
    toast.success('Client mis en pause');
    fetchChairQueue();
  };

  const handleUnfreeze = async (customerId: string) => {
    await supabase.from('queue').update({ 
      status: 'waiting',
      joined_at: new Date().toISOString() 
    }).eq('id', customerId);
    toast.success('Client réactivé et placé en file !');
    fetchChairQueue();
  };
  
  const handleHardCancel = async (customerId: string) => {
    const confirm = window.confirm("Retirer définitivement ce client de la file ?");
    if (!confirm) return;
    await supabase.from('queue').update({ status: 'cancelled' }).eq('id', customerId);
    toast("Client retiré.", { icon: '👋', style: { borderRadius: '12px', background: '#333', color: '#fff' }});
    fetchChairQueue();
  };

  const handleManualNotify = async (customer: Customer) => {
    setIsSendingAlert(customer.id);
    try {
      await supabase.from('queue').update({ alerted_at: new Date().toISOString() }).eq('id', customer.id);
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

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !authenticatedStaff) return;
    
    setIsAddingWalkIn(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const totalTime = selectedServices.reduce((total, id) => {
      const s = services.find(srv => srv.id === id);
      return total + (s?.duration_minutes || 0);
    }, 0);

    let newJoinedAt = new Date().toISOString();
    if (queueRef.current.length > 0) {
      const maxTime = Math.max(...queueRef.current.map(c => new Date(c.joined_at || new Date()).getTime()));
      const nowTime = new Date().getTime();
      if (maxTime > nowTime) {
        newJoinedAt = new Date(maxTime + 1000).toISOString(); 
      }
    }

    const { data: newTicket, error } = await supabase.from('queue').insert([{
      barber_id: shopId,
      staff_id: authenticatedStaff.id,
      customer_name: walkInName,
      whatsapp_number: 'Sur place',
      status: 'waiting',
      total_estimated_time: totalTime > 0 ? totalTime : null,
      joined_at: newJoinedAt
    }]).select().single();

    if (error) {
      toast.error("Erreur d'ajout.", { id: toastId });
    } else if (newTicket) {
      if (selectedServices.length > 0) {
        const serviceInserts = selectedServices.map(sId => ({ queue_id: newTicket.id, service_id: sId }));
        await supabase.from('queue_services').insert(serviceInserts);
      }
      toast.success("Client ajouté au fauteuil !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
      setShowWalkInModal(false);
      setWalkInName('');
      setSelectedServices([]);
      fetchChairQueue();
    }
    setIsAddingWalkIn(false);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
  };

  if (!selectedStaff) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-md w-full mx-auto text-center space-y-10 relative z-10">
          <div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-6 shadow-lg shadow-amber-500/20">
               <Scissors className="w-8 h-8 text-slate-900" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">{shopName || 'Chargement...'}</h1>
            <p className="text-slate-400 font-medium text-base mt-2">Portail Staff • Sélectionnez votre profil</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {staffList.filter(s => s.is_available).map(member => (
              <button 
                key={member.id} 
                onClick={() => setSelectedStaff(member)} 
                className="bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl p-8 rounded-[2rem] flex flex-col items-center gap-4 transition-all active:scale-[0.96] group shadow-xl"
              >
                <div className="w-16 h-16 bg-slate-900/50 group-hover:bg-amber-500/20 rounded-full flex items-center justify-center text-slate-300 group-hover:text-amber-400 transition-colors shadow-inner">
                  <User className="w-8 h-8" />
                </div>
                <span className="text-white font-black text-lg tracking-tight truncate max-w-full">{member.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedStaff && !authenticatedStaff) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col justify-between px-6 py-10 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-sm w-full mx-auto text-center pt-4 space-y-8 relative z-10">
          <button 
            onClick={() => { setSelectedStaff(null); setPin(''); }} 
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold mx-auto bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Changer de profil
          </button>
          
          <div>
            <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <User className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Bonjour, {selectedStaff.name.split(' ')[0]}</h2>
            <p className="text-slate-400 text-sm font-medium mt-2">Saisissez votre code PIN</p>
          </div>
          
          <div className="flex justify-center gap-6 py-6">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  pin.length > idx 
                    ? 'bg-amber-400 scale-125 shadow-[0_0_15px_rgba(251,191,36,0.6)]' 
                    : 'bg-slate-800 border-2 border-slate-700'
                }`} 
              />
            ))}
          </div>
        </div>

        <div className="max-w-[280px] w-full mx-auto pb-8 relative z-10">
          <div className="grid grid-cols-3 gap-x-6 gap-y-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button 
                key={num} 
                onClick={() => handleKeyPress(num)} 
                disabled={isVerifying} 
                className="w-[76px] h-[76px] mx-auto bg-white/5 active:bg-white/10 border border-white/10 backdrop-blur-md rounded-full text-3xl font-light text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
              >
                {num}
              </button>
            ))}
            <div className="w-[76px] h-[76px]" />
            <button 
              onClick={() => handleKeyPress('0')} 
              disabled={isVerifying} 
              className="w-[76px] h-[76px] mx-auto bg-white/5 active:bg-white/10 border border-white/10 backdrop-blur-md rounded-full text-3xl font-light text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
            >
              0
            </button>
            <button 
              onClick={handleBackspace} 
              disabled={isVerifying} 
              className="w-[76px] h-[76px] mx-auto text-sm font-bold text-slate-400 hover:text-white active:scale-95 flex items-center justify-center transition-colors"
            >
              Effacer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
      <div className="h-[25vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        <div className="absolute top-4 w-full left-0 px-4 flex justify-between items-center z-20">
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black tracking-wider px-3 py-1 rounded-full backdrop-blur-md">Session : {authenticatedStaff?.name}</span>
          <button onClick={() => { setAuthenticatedStaff(null); setSelectedStaff(null); setPin(''); }} className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 active:scale-95 transition-all backdrop-blur-md"><LogOut className="w-4 h-4" /></button>
        </div>
        <div className="relative z-10 mt-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Votre Fauteuil</h1>
            <p className="text-slate-400 font-medium text-xs">{shopName}</p>
          </div>
          <button onClick={() => setShowWalkInModal(true)} className="h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-transform"><UserPlus className="w-4 h-4" /> Ajouter</button>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 pt-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-y-auto">
        {queue.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-sm space-y-3">
            <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><Scissors className="w-5 h-5" /></div>
            <p>Aucun client dans votre file d'attente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((customer, index) => {
              const isAlerted = !!customer.alerted_at;
              const isConfirmed = customer.is_confirmed;
              const timeRemaining = timers[customer.id] || 0;

              if (index === 0) {
                return (
                  <div key={customer.id} className="p-5 rounded-[1.75rem] bg-slate-900 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 opacity-[0.04] pointer-events-none"><Scissors className="w-40 h-40" /></div>
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0"><Scissors className="w-5 h-5 text-slate-900" /></div>
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
                          <span key={i} className="bg-slate-800 text-slate-300 border border-slate-700/50 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">{qs.services.service_name}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 w-full mt-5 relative z-10">
                      <button onClick={() => handleComplete(customer.id)} className="flex-1 h-12 bg-emerald-500 active:bg-emerald-400 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"><Check className="w-4 h-4" /> Marquer Terminer</button>
                      <button onClick={() => handleFreeze(customer.id)} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl flex items-center justify-center shrink-0 border border-white/10"><UserX className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={customer.id} className={`p-4 rounded-[1.5rem] border flex flex-col gap-3 transition-all ${isConfirmed ? 'bg-emerald-50/40 border-emerald-300' : isAlerted ? 'bg-orange-50/40 border-orange-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm border ${isConfirmed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : isAlerted ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>#{index + 1}</div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 capitalize leading-tight">{customer.customer_name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-slate-500 font-mono text-[11px]">{customer.whatsapp_number}</span>
                          {isConfirmed && <span className="flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> En route</span>}
                          {isAlerted && !isConfirmed && <span className="flex items-center text-[9px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full animate-pulse"><Timer className="w-2.5 h-2.5 mr-0.5" /> Attente</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {customer.whatsapp_number !== 'Sur place' && !isConfirmed && (
                      <div className="col-span-2">
                        {isAlerted ? (
                          <div className={`w-full h-10 font-black rounded-xl text-xs flex items-center justify-center gap-2 text-white ${timeRemaining > 0 ? 'bg-orange-500' : 'bg-red-500'}`}><Timer className="w-4 h-4" /> {timeRemaining > 0 ? formatTime(timeRemaining) : "Relégation..."}</div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleManualNotify(customer)} disabled={isSendingAlert === customer.id} className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl text-xs disabled:opacity-50">
                              {isSendingAlert === customer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Bell className="w-3.5 h-3.5 text-amber-400" /> Appeler (Push)</>}
                            </button>
                            {customer.whatsapp_number && (
                              <a
                                href={`https://wa.me/${customer.whatsapp_number.replace(/\D/g, '').replace(/^0/, '212')}?text=${encodeURIComponent(`Salam ${customer.customer_name}, c'est bientôt votre tour chez ${shopName} (${authenticatedStaff?.name || 'au fauteuil'}) ! Merci de vous rapprocher.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl active:scale-[0.98] shrink-0 transition-colors"
                                title="Alerter sur WhatsApp (Gratuit)"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <button onClick={() => handleHardCancel(customer.id)} className="h-10 flex items-center justify-center gap-1.5 font-bold rounded-xl text-xs bg-red-50 text-red-600 border border-red-100/60 transition-colors hover:bg-red-100"><X className="w-3.5 h-3.5" /> Retirer</button>
                    <button onClick={() => handleFreeze(customer.id)} className="h-10 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs border border-blue-100/60"><Snowflake className="w-3.5 h-3.5" /> Mettre Pause</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {frozenQueue.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-3 px-1 text-slate-500 font-bold text-xs uppercase tracking-wider"><Snowflake className="w-3.5 h-3.5 text-blue-500" /> Clients en pause</div>
            <div className="space-y-2">
              {frozenQueue.map(customer => (
                <div key={customer.id} className="bg-white p-3 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 capitalize">{customer.customer_name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleUnfreeze(customer.id)} className="h-8 px-3 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs transition-colors">Réactiver</button>
                    <button onClick={() => handleHardCancel(customer.id)} className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 font-bold rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showWalkInModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowWalkInModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 bg-slate-900 text-amber-400 flex items-center justify-center rounded-2xl mb-4 shadow-sm"><UserPlus className="w-7 h-7" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Client sur place</h3>
            <p className="text-slate-500 font-medium text-sm mb-6">Ajoutez un client directement sur votre fauteuil.</p>
            
            <form onSubmit={handleAddWalkIn}>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1 transition-all mb-5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prénom du client</label>
                <input type="text" autoFocus required value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Ex: Karim" />
              </div>

              {services.length > 0 && (
                <div className="mb-6">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Prestations (Optionnel)</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {services.map(service => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <button type="button" key={service.id} onClick={() => toggleService(service.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                          <div>
                            <h4 className={`font-bold text-sm ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{service.service_name}</h4>
                            <p className="text-slate-400 text-xs">{service.duration_minutes} min • {service.price_dh} DH</p>
                          </div>
                          {isSelected ? <CheckCircle2 className="w-5 h-5 text-slate-900" /> : <Circle className="w-5 h-5 text-slate-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="submit" disabled={isAddingWalkIn || !walkInName.trim()} className="w-full h-14 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-2xl transition-all disabled:opacity-50 text-lg flex items-center justify-center gap-2">
                {isAddingWalkIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ajouter à mon fauteuil'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}