'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, MapPin, Users, ArrowRight, LogIn, CheckCircle2, Circle, X, UserCircle } from 'lucide-react';

export default function SmartStorefront() {
  const params = useParams();
  const barberId = params.id as string;
  const router = useRouter();

  const [barber, setBarber] = useState<any>(null);
  const [queueLength, setQueueLength] = useState(0);
  
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // ✨ NEW: Staff State
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      // 1. Fetch Barber Info
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

      // 2. Fetch Queue Length
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barberId)
        .eq('status', 'waiting');
      setQueueLength(count || 0);

      // 3. Fetch Available Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberId)
        .order('price_dh', { ascending: true });
      
      if (servicesData) {
        setServices(servicesData);
      }

      // ✨ NEW: Fetch Available Staff Members
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_available', true)
        .order('created_at', { ascending: true });
        
      if (staffData) {
        setStaffMembers(staffData);
      }

      setIsLoading(false);
    };

    if (barberId) fetchData();
  }, [barberId]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleInitialClick = async () => {
    if (!user) {
      localStorage.setItem('pending_booking_barber_id', barberId);
      router.push('/client/signup');
      return;
    }

    const toastId = toast.loading("Vérification...", { style: { borderRadius: '12px' } });
    const { data: existingTicket } = await supabase
      .from('queue')
      .select('id')
      .eq('customer_id', user.id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existingTicket) {
      toast.error("Vous êtes déjà dans une file d'attente !", { id: toastId, duration: 4000 });
      router.push('/client/dashboard');
      return;
    }

    toast.dismiss(toastId);
    
    // Open modal if they have services OR staff to choose from
    if (services.length > 0 || staffMembers.length > 0) {
      setShowServiceModal(true);
    } else {
      submitBooking(); 
    }
  };

  const submitBooking = async () => {
    setIsBooking(true);
    setShowServiceModal(false);
    const toastId = toast.loading("Réservation de votre place...", { style: { borderRadius: '12px' } });

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!customerData) {
      toast.error("Profil incomplet. Veuillez vous reconnecter.", { id: toastId, duration: 4000 });
      setIsBooking(false);
      return;
    }

    const totalTime = selectedServices.reduce((total, id) => {
      const service = services.find(s => s.id === id);
      return total + (service?.duration_minutes || 0);
    }, 0);

    // ✨ UPDATED: Insert Main Queue Ticket WITH staff_id
    const { data: newTicket, error: queueError } = await supabase
      .from('queue')
      .insert([{
        barber_id: barberId,
        customer_id: user.id, 
        customer_name: customerData.full_name, 
        whatsapp_number: customerData.phone_number, 
        status: 'waiting',
        total_estimated_time: totalTime > 0 ? totalTime : null,
        staff_id: selectedStaffId // Added Staff ID
      }])
      .select()
      .single();

    if (queueError) {
      if (queueError.code === '23505') {
        toast.error("Vous êtes déjà dans une file d'attente !", { id: toastId, duration: 4000 });
        router.push('/client/dashboard');
      } else {
        toast.error(`Erreur DB: ${queueError.message}`, { id: toastId, duration: 6000 });
      }
      setIsBooking(false);
      return;
    }

    if (newTicket && selectedServices.length > 0) {
      const serviceInserts = selectedServices.map(serviceId => ({
        queue_id: newTicket.id,
        service_id: serviceId
      }));

      const { error: servicesError } = await supabase
        .from('queue_services')
        .insert(serviceInserts);
        
      if (servicesError) console.error("Error linking services:", servicesError);
    }

    localStorage.removeItem('pending_booking_barber_id');
    toast.success("Place réservée avec succès !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    router.push('/client/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-200 max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-black text-zinc-900 mb-2">Salon introuvable</h1>
          <p className="text-zinc-500 font-medium text-sm">Ce code QR n'est plus valide.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col relative font-sans selection:bg-zinc-200">
      
      {/* PREMIUM HERO */}
      <div className="h-[45vh] w-full bg-zinc-950 relative flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950 to-zinc-950"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center mt-4">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-zinc-800 rounded-full blur-md opacity-50"></div>
            {barber.profile_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={barber.profile_image_url} alt={barber.shop_name} className="relative w-28 h-28 rounded-full object-cover border-4 border-zinc-900 shadow-2xl" />
            ) : (
              <div className="relative w-28 h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center border-4 border-zinc-950 shadow-2xl">
                <Scissors className="w-10 h-10 text-zinc-400" />
              </div>
            )}
            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-zinc-950 ${barber.is_open ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-3">{barber.shop_name}</h1>
          {barber.location ? (
            <a href={barber.location} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-sm font-medium backdrop-blur-md">
              <MapPin className="w-4 h-4" /> Voir sur la carte
            </a>
          ) : (
            <p className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-sm font-medium backdrop-blur-md">
              <MapPin className="w-4 h-4" /> Maroc
            </p>
          )}
        </div>
      </div>

      {/* QUEUE CONTENT SECTION */}
      <div className="flex-1 bg-zinc-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {!barber.is_open && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-center font-bold mb-6">
            Le salon est actuellement fermé.
          </div>
        )}

        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-[0.02] pointer-events-none">
            <Users className="w-48 h-48" />
          </div>
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Dans la file d'attente</p>
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-6xl font-black text-zinc-900 tracking-tighter leading-none">{queueLength}</h3>
          </div>
          <p className="text-zinc-500 font-medium text-sm">
            {queueLength > 1 ? 'personnes avant vous' : queueLength === 1 ? 'personne avant vous' : 'Aucune attente !'}
          </p>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-zinc-100 z-50 pb-8">
        <button 
          onClick={handleInitialClick} 
          disabled={!barber.is_open || isBooking} 
          className="w-full h-16 bg-zinc-900 active:bg-black disabled:bg-zinc-300 text-white font-black rounded-2xl transition-all text-lg flex justify-center items-center gap-2 shadow-xl shadow-zinc-900/20"
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

      {/* SERVICES & STAFF SELECTION MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-zinc-950/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl transform transition-all animate-in slide-in-from-bottom-8 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-black text-zinc-900">Que désirez-vous ?</h3>
                <p className="text-sm font-medium text-zinc-500">Personnalisez votre visite</p>
              </div>
              <button onClick={() => setShowServiceModal(false)} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 active:bg-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 pb-6 [&::-webkit-scrollbar]:hidden flex-1">
              
              {/* ✨ NEW: Staff Selection Row */}
              {staffMembers.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4" /> Avec qui ?
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                    <button
                      onClick={() => setSelectedStaffId(null)}
                      className={`shrink-0 px-5 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                        selectedStaffId === null 
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-md shadow-zinc-900/20' 
                          : 'border-zinc-100 bg-white text-zinc-600 hover:border-zinc-200'
                      }`}
                    >
                      N'importe qui
                    </button>
                    {staffMembers.map(staff => (
                      <button
                        key={staff.id}
                        onClick={() => setSelectedStaffId(staff.id)}
                        className={`shrink-0 px-5 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                          selectedStaffId === staff.id 
                            ? 'border-zinc-900 bg-zinc-900 text-white shadow-md shadow-zinc-900/20' 
                            : 'border-zinc-100 bg-white text-zinc-600 hover:border-zinc-200'
                        }`}
                      >
                        {staff.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Services List */}
              {services.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Scissors className="w-4 h-4" /> Prestations
                  </h4>
                  <div className="space-y-3">
                    {services.map(service => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                            isSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 hover:border-zinc-200 bg-white'
                          }`}
                        >
                          <div>
                            <h4 className={`font-bold text-lg ${isSelected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                              {service.service_name}
                            </h4>
                            <p className="text-zinc-500 font-medium text-sm">
                              {service.duration_minutes} min • {service.price_dh} DH
                            </p>
                          </div>
                          {isSelected ? <CheckCircle2 className="w-6 h-6 text-zinc-900" /> : <Circle className="w-6 h-6 text-zinc-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 shrink-0">
              <button 
                onClick={submitBooking}
                disabled={isBooking || (services.length > 0 && selectedServices.length === 0)}
                className="w-full h-14 bg-zinc-900 disabled:bg-zinc-300 active:bg-black text-white font-bold rounded-xl transition-all text-lg flex justify-center items-center gap-2"
              >
                {isBooking ? (
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  `Confirmer et rejoindre ${selectedServices.length > 0 ? `(${selectedServices.length})` : ''}`
                )}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}