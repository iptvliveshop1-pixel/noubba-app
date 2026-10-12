'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, MapPin, Users, ArrowRight, LogIn, CheckCircle2, Circle, X, UserCircle, Clock, User, Phone, Globe } from 'lucide-react';

const translations = {
  fr: {
    salonNotFound: "Ce salon n'existe pas ou le lien est invalide.",
    qrInvalidTitle: "Salon introuvable",
    qrInvalidDesc: "Ce code QR n'est plus valide.",
    seeOnMap: "Voir sur la carte",
    locationDefault: "Maroc",
    closedNow: "Le salon est actuellement fermé.",
    closedBtn: "Fermé pour le moment",
    estimatedWait: "Estimation d'attente",
    noWait: "Aucune",
    salonFree: "Le salon est libre, prenez votre place !",
    avgPerBarber: "en moyenne par coiffeur",
    personSingular: "personne",
    personPlural: "personnes",
    barbersAvailable: "coiffeurs disponibles",
    takeMyPlace: "Prendre ma place",
    loginToBook: "Se connecter pour réserver",
    whatDoYouWant: "Que désirez-vous ?",
    customizeVisit: "Personnalisez votre visite",
    withWhom: "Avec qui ?",
    firstAvailable: "Le Premier Dispo",
    servicesTitle: "Prestations",
    confirmAndJoin: "Confirmer et rejoindre",
    yourDetails: "Vos coordonnées",
    detailsSubtitle: "Renseignez votre nom et numéro pour valider votre place dans la file.",
    fullName: "Nom Complet",
    fullNamePlaceholder: "Ex: Youssef Bennani",
    phoneNumber: "Numéro de téléphone",
    phonePlaceholder: "06 00 00 00 00",
    confirmMyPlace: "Confirmer ma place",
    alreadyInQueue: "Vous êtes déjà dans une file d'attente !",
    ticketReserved: "Place réservée avec succès !",
    verifying: "Vérification...",
    savingProfile: "Création de votre profil...",
    profileSaved: "Profil enregistré !",
    reservingSpot: "Réservation de votre place...",
    min: "min",
    currency: "DH"
  },
  en: {
    salonNotFound: "This salon does not exist or the link is invalid.",
    qrInvalidTitle: "Shop Not Found",
    qrInvalidDesc: "This QR code is no longer valid.",
    seeOnMap: "View on map",
    locationDefault: "Morocco",
    closedNow: "The salon is currently closed.",
    closedBtn: "Currently Closed",
    estimatedWait: "Estimated Wait",
    noWait: "None",
    salonFree: "No wait right now, take your spot!",
    avgPerBarber: "on average per barber",
    personSingular: "person",
    personPlural: "people",
    barbersAvailable: "barbers available",
    takeMyPlace: "Join the Queue",
    loginToBook: "Sign in to join queue",
    whatDoYouWant: "Select Services",
    customizeVisit: "Customize your visit",
    withWhom: "Choose Barber",
    firstAvailable: "First Available",
    servicesTitle: "Services",
    confirmAndJoin: "Confirm & Join Queue",
    yourDetails: "Your Contact Details",
    detailsSubtitle: "Enter your name and phone number to secure your spot.",
    fullName: "Full Name",
    fullNamePlaceholder: "Ex: Alex Miller",
    phoneNumber: "Phone Number",
    phonePlaceholder: "06 00 00 00 00",
    confirmMyPlace: "Confirm My Spot",
    alreadyInQueue: "You are already in a queue!",
    ticketReserved: "Spot reserved successfully!",
    verifying: "Verifying...",
    savingProfile: "Saving your details...",
    profileSaved: "Profile saved!",
    reservingSpot: "Securing your spot...",
    min: "min",
    currency: "DH"
  }
};

export default function SmartStorefront() {
  const params = useParams();
  const barberId = params.id as string;
  const router = useRouter();

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = translations[lang];

  const [barber, setBarber] = useState<any>(null);
  const [totalQueueLength, setTotalQueueLength] = useState(0);
  
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Profile completion modal for missing/OAuth customers
  const [showProfilePromptModal, setShowProfilePromptModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('noubba_lang');
    if (savedLang === 'en' || savedLang === 'fr') {
      setLang(savedLang);
    }

    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user?.user_metadata) {
        setProfileName(session.user.user_metadata.full_name || session.user.user_metadata.name || '');
      }

      // 1. Fetch Barber Info
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .single();

      if (barberError || !barberData) {
        toast.error(t.salonNotFound, { icon: '❌' });
        setIsLoading(false);
        return;
      }
      setBarber(barberData);

      // 2. Fetch Available Staff Members First
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('barber_id', barberId)
        .eq('is_available', true)
        .order('created_at', { ascending: true });
        
      if (staffData) {
        setStaffMembers(staffData);
      }

      // 3. Fetch Total Queue Length
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barberId)
        .eq('status', 'waiting');
      setTotalQueueLength(count || 0);

      // 4. Fetch Available Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberId)
        .order('price_dh', { ascending: true });
      
      if (servicesData) {
        setServices(servicesData);
      }

      setIsLoading(false);
    };

    if (barberId) fetchData();
  }, [barberId, t.salonNotFound]);

  const toggleLanguage = () => {
    const nextLang = lang === 'fr' ? 'en' : 'fr';
    setLang(nextLang);
    localStorage.setItem('noubba_lang', nextLang);
  };

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

    const toastId = toast.loading(t.verifying, { style: { borderRadius: '12px' } });
    const { data: existingTicket } = await supabase
      .from('queue')
      .select('id')
      .eq('customer_id', user.id)
      .in('status', ['waiting', 'frozen'])
      .maybeSingle();

    if (existingTicket) {
      toast.error(t.alreadyInQueue, { id: toastId, duration: 4000 });
      router.push('/client/dashboard');
      return;
    }

    toast.dismiss(toastId);

    if (services.length > 0) {
      setShowServiceModal(true);
    } else {
      submitBooking();
    }
  };

  const handleSaveProfileAndBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profilePhone.trim() || !user) return;
    
    setIsSavingProfile(true);
    const toastId = toast.loading(t.savingProfile);

    const cleanPhone = profilePhone.replace(/\s+/g, '');
    const { data: newCustomer, error } = await supabase.from('customers').upsert([{
      id: user.id,
      full_name: profileName.trim(),
      phone_number: cleanPhone
    }]).select().single();

    if (error || !newCustomer) {
      toast.error(`Erreur: ${error?.message || 'Database error'}`, { id: toastId });
      setIsSavingProfile(false);
      return;
    }

    toast.success(t.profileSaved, { id: toastId });
    setShowProfilePromptModal(false);
    setIsSavingProfile(false);
    
    submitBooking();
  };

  const submitBooking = async () => {
    setIsBooking(true);
    setShowServiceModal(false);
    const toastId = toast.loading(t.reservingSpot, { style: { borderRadius: '12px' } });

    let { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!customerData || !customerData.phone_number) {
      toast.dismiss(toastId);
      setIsBooking(false);
      setShowProfilePromptModal(true);
      return;
    }

    const totalTime = selectedServices.reduce((total, id) => {
      const service = services.find(s => s.id === id);
      return total + (service?.duration_minutes || 0);
    }, 0);

    const { data: newTicket, error: queueError } = await supabase
      .from('queue')
      .insert([{
        barber_id: barberId,
        customer_id: user.id, 
        customer_name: customerData.full_name, 
        whatsapp_number: customerData.phone_number, 
        status: 'waiting',
        total_estimated_time: totalTime > 0 ? totalTime : null,
        staff_id: selectedStaffId 
      }])
      .select()
      .single();

    if (queueError) {
      if (queueError.code === '23505') {
        toast.error(t.alreadyInQueue, { id: toastId, duration: 4000 });
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
    toast.success(t.ticketReserved, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
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
          <h1 className="text-xl font-black text-zinc-900 mb-2">{t.qrInvalidTitle}</h1>
          <p className="text-zinc-500 font-medium text-sm">{t.qrInvalidDesc}</p>
        </div>
      </div>
    );
  }

  const activeChairs = Math.max(1, staffMembers.length);
  const effectiveQueuePosition = Math.ceil((totalQueueLength + 1) / activeChairs);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col relative font-sans selection:bg-zinc-200">
      
      {/* PREMIUM HERO */}
      <div className="h-[45vh] w-full bg-zinc-950 relative flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950 to-zinc-950"></div>
        
        {/* LANGUAGE TOGGLE BUTTON */}
        <button
          onClick={toggleLanguage}
          className="absolute top-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/60 text-white text-xs font-bold backdrop-blur-md hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          title="Changer de langue / Switch language"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span className="uppercase tracking-wider font-mono">{lang === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</span>
        </button>

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
              <MapPin className="w-4 h-4" /> {t.seeOnMap}
            </a>
          ) : (
            <p className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-sm font-medium backdrop-blur-md">
              <MapPin className="w-4 h-4" /> {t.locationDefault}
            </p>
          )}
        </div>
      </div>

      {/* QUEUE CONTENT SECTION */}
      <div className="flex-1 bg-zinc-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {!barber.is_open && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-center font-bold mb-6">
            {t.closedNow}
          </div>
        )}

        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 flex flex-col items-center justify-center mb-6 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-[0.02] pointer-events-none">
            <Users className="w-48 h-48" />
          </div>
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">{t.estimatedWait}</p>
          
          {totalQueueLength === 0 ? (
            <>
              <h3 className="text-4xl font-black text-emerald-500 tracking-tighter leading-none mb-2">{t.noWait}</h3>
              <p className="text-zinc-500 font-medium text-sm">{t.salonFree}</p>
            </>
          ) : (
            <>
              <h3 className="text-6xl font-black text-zinc-900 tracking-tighter leading-none mb-1">
                ~{effectiveQueuePosition}
              </h3>
              <p className="text-zinc-500 font-medium text-sm text-center">
                {effectiveQueuePosition > 1 ? t.personPlural : t.personSingular} {t.avgPerBarber}
              </p>
              
              {staffMembers.length > 1 && (
                <div className="mt-4 bg-zinc-50 border border-zinc-100 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <Scissors className="w-4 h-4" /> {staffMembers.length} {t.barbersAvailable}
                </div>
              )}
            </>
          )}
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
            t.closedBtn
          ) : user ? (
            <>{t.takeMyPlace} <ArrowRight className="w-5 h-5" /></>
          ) : (
            <>{t.loginToBook} <LogIn className="w-5 h-5" /></>
          )}
        </button>
      </div>

      {/* PROFILE COMPLETION MODAL */}
      {showProfilePromptModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowProfilePromptModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 bg-zinc-100 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl mb-4">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-1">{t.yourDetails}</h3>
            <p className="text-zinc-500 font-medium text-xs mb-5">{t.detailsSubtitle}</p>
            
            <form onSubmit={handleSaveProfileAndBook} className="space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 focus-within:border-zinc-900 focus-within:ring-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{t.fullName}</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input 
                    type="text" 
                    required 
                    autoFocus
                    value={profileName} 
                    onChange={(e) => setProfileName(e.target.value)} 
                    placeholder={t.fullNamePlaceholder} 
                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-zinc-900 focus:ring-0 outline-none" 
                  />
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 focus-within:border-zinc-900 focus-within:ring-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{t.phoneNumber}</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input 
                    type="tel" 
                    required 
                    value={profilePhone} 
                    onChange={(e) => setProfilePhone(e.target.value)} 
                    placeholder={t.phonePlaceholder} 
                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-zinc-900 focus:ring-0 outline-none" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSavingProfile || !profileName.trim() || !profilePhone.trim()} 
                className="w-full h-14 bg-zinc-900 active:bg-black disabled:bg-zinc-300 text-white font-black rounded-2xl transition-all text-base flex justify-center items-center gap-2 shadow-lg"
              >
                {isSavingProfile ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>{t.confirmMyPlace} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SERVICES & STAFF SELECTION MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-zinc-950/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl transform transition-all animate-in slide-in-from-bottom-8 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-black text-zinc-900">{t.whatDoYouWant}</h3>
                <p className="text-sm font-medium text-zinc-500">{t.customizeVisit}</p>
              </div>
              <button onClick={() => setShowServiceModal(false)} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 active:bg-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 pb-6 [&::-webkit-scrollbar]:hidden flex-1">
              
              {staffMembers.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4" /> {t.withWhom}
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
                      {t.firstAvailable}
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

              {services.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Scissors className="w-4 h-4" /> {t.servicesTitle}
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
                          <div className="flex items-center gap-3">
                            {service.image_url && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={service.image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200" />
                            )}
                            <div>
                              <h4 className={`font-bold text-lg ${isSelected ? 'text-zinc-900' : 'text-zinc-700'}`}>
                                {service.service_name}
                              </h4>
                              <p className="text-zinc-500 font-medium text-sm">
                                {service.duration_minutes} {t.min} • {service.price_dh} {t.currency}
                              </p>
                            </div>
                          </div>
                          {isSelected ? <CheckCircle2 className="w-6 h-6 text-zinc-900 shrink-0" /> : <Circle className="w-6 h-6 text-zinc-300 shrink-0" />}
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
                  `${t.confirmAndJoin} ${selectedServices.length > 0 ? `(${selectedServices.length})` : ''}`
                )}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}