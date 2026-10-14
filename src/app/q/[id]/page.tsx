'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, MapPin, Users, ArrowRight, CheckCircle2, Circle, X, UserCircle, Phone, User, Globe, Clock } from 'lucide-react';

const toSlug = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const DEFAULT_WORKING_HOURS: Record<string, any> = {
  auto_mode: false,
  monday:    { open: '09:30', close: '21:30', closed: false },
  tuesday:   { open: '09:30', close: '21:30', closed: false },
  wednesday: { open: '09:30', close: '21:30', closed: false },
  thursday:  { open: '09:30', close: '21:30', closed: false },
  friday:    { open: '15:00', close: '22:00', closed: false },
  saturday:  { open: '09:30', close: '22:00', closed: false },
  sunday:    { open: '10:00', close: '20:00', closed: true },
};

const translations = {
  fr: {
    salonNotFound: "Ce salon n'existe pas ou le lien est invalide.",
    qrInvalidTitle: "Salon introuvable",
    qrInvalidDesc: "Ce lien ou code QR n'est plus valide.",
    seeOnMap: "Voir sur la carte",
    locationDefault: "Maroc",
    closedNow: "Le salon est actuellement fermé.",
    closedBtn: "Fermé pour le moment",
    opensAt: "Ouvre à",
    dayOff: "Jour de repos",
    todayHours: "Aujourd'hui",
    weeklyHoursTitle: "Horaires d'ouverture",
    estimatedWait: "Estimation d'attente",
    noWait: "Aucune",
    salonFree: "Le salon est libre, prenez votre place !",
    avgPerBarber: "en moyenne par coiffeur",
    personSingular: "personne",
    personPlural: "personnes",
    barbersAvailable: "coiffeurs disponibles",
    takeMyPlace: "Prendre ma place",
    whatDoYouWant: "Que désirez-vous ?",
    customizeVisit: "Personnalisez votre visite",
    withWhom: "Avec qui ?",
    firstAvailable: "Le Premier Dispo",
    servicesTitle: "Prestations",
    confirmAndJoin: "Continuer",
    yourDetails: "Vos coordonnées",
    detailsSubtitle: "Renseignez votre prénom et numéro WhatsApp pour suivre votre tour en direct.",
    fullName: "Votre Prénom",
    fullNamePlaceholder: "Ex: Youssef",
    phoneNumber: "Téléphone WhatsApp",
    phonePlaceholder: "06 00 00 00 00",
    confirmMyPlace: "Confirmer ma place",
    alreadyInQueue: "Vous avez déjà un ticket actif dans la file !",
    ticketReserved: "Place réservée avec succès !",
    verifying: "Vérification...",
    savingProfile: "Validation de votre place...",
    reservingSpot: "Réservation de votre place...",
    min: "min",
    currency: "DH",
    invalidPhone: "Veuillez entrer un numéro valide (10 chiffres).",
    invalidName: "Veuillez entrer votre prénom.",
    days: {
      monday: "Lundi",
      tuesday: "Mardi",
      wednesday: "Mercredi",
      thursday: "Jeudi",
      friday: "Vendredi",
      saturday: "Samedi",
      sunday: "Dimanche"
    }
  },
  en: {
    salonNotFound: "This salon does not exist or the link is invalid.",
    qrInvalidTitle: "Shop Not Found",
    qrInvalidDesc: "This link or QR code is no longer valid.",
    seeOnMap: "View on map",
    locationDefault: "Morocco",
    closedNow: "The salon is currently closed.",
    closedBtn: "Currently Closed",
    opensAt: "Opens at",
    dayOff: "Closed",
    todayHours: "Today",
    weeklyHoursTitle: "Opening Hours",
    estimatedWait: "Estimated Wait",
    noWait: "None",
    salonFree: "No wait right now, take your spot!",
    avgPerBarber: "on average per barber",
    personSingular: "person",
    personPlural: "people",
    barbersAvailable: "barbers available",
    takeMyPlace: "Join the Queue",
    whatDoYouWant: "Select Services",
    customizeVisit: "Customize your visit",
    withWhom: "Choose Barber",
    firstAvailable: "First Available",
    servicesTitle: "Services",
    confirmAndJoin: "Continue",
    yourDetails: "Your Contact Details",
    detailsSubtitle: "Enter your first name and WhatsApp number to track your spot live.",
    fullName: "First Name",
    fullNamePlaceholder: "Ex: Youssef",
    phoneNumber: "WhatsApp Phone",
    phonePlaceholder: "06 00 00 00 00",
    confirmMyPlace: "Confirm My Spot",
    alreadyInQueue: "You already have an active ticket in the queue!",
    ticketReserved: "Spot reserved successfully!",
    verifying: "Verifying...",
    savingProfile: "Securing your spot...",
    reservingSpot: "Securing your spot...",
    min: "min",
    currency: "DH",
    invalidPhone: "Please enter a valid 10-digit phone number.",
    invalidName: "Please enter your first name.",
    days: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday"
    }
  }
};

export default function SmartStorefront() {
  const params = useParams();
  const rawIdentifier = (params.id || params.barberId) as string;
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
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Guest Details Modal
  const [showProfilePromptModal, setShowProfilePromptModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('noubba_lang');
    if (savedLang === 'en' || savedLang === 'fr') {
      setLang(savedLang);
    }

    const savedName = localStorage.getItem('noubba_guest_name');
    const savedPhone = localStorage.getItem('noubba_guest_phone');
    if (savedName) setProfileName(savedName);
    if (savedPhone) setProfilePhone(savedPhone);

    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      if (session?.user?.user_metadata) {
        const metaName = session.user.user_metadata.full_name || session.user.user_metadata.name || '';
        if (metaName && !savedName) setProfileName(metaName);
      }

      const savedTicketId = localStorage.getItem('noubba_ticket_id');
      if (savedTicketId) {
        const { data: existingTicket } = await supabase
          .from('queue')
          .select('id, status')
          .eq('id', savedTicketId)
          .in('status', ['waiting', 'frozen'])
          .maybeSingle();

        if (existingTicket) {
          setActiveTicketId(existingTicket.id);
        } else {
          localStorage.removeItem('noubba_ticket_id');
        }
      }

      // 1. Resolve Barber by UUID or Vanity Slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawIdentifier);
      let barberData: any = null;

      if (isUUID) {
        const { data } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', rawIdentifier)
          .maybeSingle();
        barberData = data;
      } else {
        const targetSlug = toSlug(decodeURIComponent(rawIdentifier));
        const { data: allBarbers } = await supabase
          .from('barbers')
          .select('*')
          .eq('approval_status', 'approved');

        if (allBarbers) {
          barberData = allBarbers.find(
            b => toSlug(b.shop_name || '') === targetSlug || toSlug(b.owner_name || '') === targetSlug
          );
        }
      }

      if (!barberData || barberData.is_active === false || barberData.approval_status === 'rejected') {
        toast.error(t.salonNotFound, { icon: '❌' });
        setIsLoading(false);
        return;
      }

      const resolvedBarberId = barberData.id;
      setBarber(barberData);

      // 2. Fetch Available Staff Members
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name, is_available')
        .eq('barber_id', resolvedBarberId)
        .eq('is_available', true)
        .order('created_at', { ascending: true });
        
      if (staffData) {
        setStaffMembers(staffData);
      }

      // 3. Fetch Total Queue Length
      const { count } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', resolvedBarberId)
        .eq('status', 'waiting');
      setTotalQueueLength(count || 0);

      // 4. Fetch Available Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', resolvedBarberId)
        .order('price_dh', { ascending: true });
      
      if (servicesData) {
        setServices(servicesData);
      }

      setIsLoading(false);
    };

    if (rawIdentifier) fetchData();
  }, [rawIdentifier, t.salonNotFound]);

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

  const handleInitialClick = () => {
    if (activeTicketId) {
      toast(t.alreadyInQueue, { icon: '🎟️' });
      router.push(`/client/dashboard?id=${activeTicketId}`);
      return;
    }

    if (services.length > 0) {
      setShowServiceModal(true);
    } else {
      setShowProfilePromptModal(true);
    }
  };

  const handleServicesConfirmed = () => {
    setShowServiceModal(false);
    setShowProfilePromptModal(true);
  };

  const handleGuestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barber) return;

    if (!profileName.trim()) {
      toast.error(t.invalidName);
      return;
    }

    const cleanPhone = profilePhone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      toast.error(t.invalidPhone);
      return;
    }

    setIsSavingProfile(true);
    const toastId = toast.loading(t.reservingSpot, { style: { borderRadius: '12px' } });

    localStorage.setItem('noubba_guest_name', profileName.trim());
    localStorage.setItem('noubba_guest_phone', cleanPhone);

    if (user) {
      await supabase.from('customers').upsert([{
        id: user.id,
        full_name: profileName.trim(),
        phone_number: cleanPhone
      }]);
    }

    const totalTime = selectedServices.reduce((total, id) => {
      const service = services.find(s => s.id === id);
      return total + (service?.duration_minutes || 0);
    }, 0);

    const { data: newTicket, error: queueError } = await supabase
      .from('queue')
      .insert([{
        barber_id: barber.id,
        customer_id: user?.id || null, 
        customer_name: profileName.trim(), 
        whatsapp_number: cleanPhone, 
        status: 'waiting',
        total_estimated_time: totalTime > 0 ? totalTime : null,
        staff_id: selectedStaffId || null,
        joined_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (queueError) {
      toast.error(`Erreur: ${queueError.message}`, { id: toastId });
      setIsSavingProfile(false);
      return;
    }

    if (newTicket && selectedServices.length > 0) {
      const serviceInserts = selectedServices.map(serviceId => ({
        queue_id: newTicket.id,
        service_id: serviceId
      }));

      await supabase.from('queue_services').insert(serviceInserts);
    }

    localStorage.setItem('noubba_ticket_id', newTicket.id);
    setActiveTicketId(newTicket.id);

    toast.success(t.ticketReserved, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    setShowProfilePromptModal(false);
    setIsSavingProfile(false);

    router.push(`/client/dashboard?id=${newTicket.id}`);
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

  // Evaluate Weekly Schedule & Manual Override
  const hoursConfig = barber.working_hours || DEFAULT_WORKING_HOURS;
  const now = new Date();
  const todayKey = DAY_KEYS[now.getDay()];
  const todaySchedule = hoursConfig[todayKey] || DEFAULT_WORKING_HOURS[todayKey];
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let isWithinSchedule = true;
  if (hoursConfig.auto_mode) {
    if (todaySchedule?.closed) {
      isWithinSchedule = false;
    } else if (todaySchedule?.open && todaySchedule?.close) {
      isWithinSchedule = currentHHMM >= todaySchedule.open && currentHHMM <= todaySchedule.close;
    }
  }

  const isEffectiveOpen = Boolean(barber.is_open) && isWithinSchedule;
  const activeChairs = Math.max(1, staffMembers.length);
  const effectiveQueuePosition = Math.ceil((totalQueueLength + 1) / activeChairs);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col relative font-sans selection:bg-zinc-200">
      
      {/* PREMIUM HERO */}
      <div className="h-[46vh] w-full bg-zinc-950 relative flex flex-col items-center justify-center px-6 overflow-hidden">
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
            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-zinc-950 ${isEffectiveOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-3">{barber.shop_name}</h1>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            {barber.location ? (
              <a href={barber.location.startsWith('http') ? barber.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barber.location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs font-medium backdrop-blur-md">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> {t.seeOnMap}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs font-medium backdrop-blur-md">
                <MapPin className="w-3.5 h-3.5" /> {t.locationDefault}
              </span>
            )}

            <button
              onClick={() => setShowHoursModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs font-medium backdrop-blur-md"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {todaySchedule?.closed ? t.dayOff : `${todaySchedule?.open || '09:30'} - ${todaySchedule?.close || '21:30'}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* QUEUE CONTENT SECTION */}
      <div className="flex-1 bg-zinc-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {!isEffectiveOpen && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-center font-bold mb-6">
            <p>{t.closedNow}</p>
            {!todaySchedule?.closed && todaySchedule?.open && (
              <p className="text-xs font-semibold text-red-500 mt-1">
                {t.todayHours} : {todaySchedule.open} – {todaySchedule.close}
              </p>
            )}
          </div>
        )}

        {activeTicketId && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between mb-6 shadow-sm">
            <div>
              <p className="font-bold text-amber-900 text-sm">Vous avez une place active !</p>
              <p className="text-amber-700 text-xs">Suivez votre tour en direct sur votre écran.</p>
            </div>
            <button
              onClick={() => router.push(`/client/dashboard?id=${activeTicketId}`)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black rounded-xl text-xs transition-colors shadow-sm"
            >
              Voir mon ticket
            </button>
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
          disabled={!isEffectiveOpen || isBooking} 
          className="w-full h-16 bg-zinc-900 active:bg-black disabled:bg-zinc-300 text-white font-black rounded-2xl transition-all text-lg flex justify-center items-center gap-2 shadow-xl shadow-zinc-900/20"
        >
          {isBooking ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : !isEffectiveOpen ? (
            !todaySchedule?.closed && todaySchedule?.open && currentHHMM < todaySchedule.open
              ? `${t.closedBtn} • ${t.opensAt} ${todaySchedule.open}`
              : t.closedBtn
          ) : (
            <>{t.takeMyPlace} <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>

      {/* WEEKLY OPENING HOURS MODAL */}
      {showHoursModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowHoursModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 bg-zinc-100 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 leading-tight">{t.weeklyHoursTitle}</h3>
                <p className="text-xs font-medium text-zinc-400">{barber.shop_name}</p>
              </div>
            </div>

            <div className="space-y-2">
              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((dayKey) => {
                const daySched = hoursConfig[dayKey] || DEFAULT_WORKING_HOURS[dayKey];
                const isToday = dayKey === todayKey;
                return (
                  <div 
                    key={dayKey} 
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs ${
                      isToday ? 'bg-amber-50 border border-amber-200 font-black text-zinc-900' : 'bg-zinc-50 text-zinc-600 font-bold'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {t.days[dayKey]}
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                    </span>
                    <span className={daySched?.closed ? 'text-red-500 font-bold' : 'font-mono text-zinc-800'}>
                      {daySched?.closed ? t.dayOff : `${daySched?.open} – ${daySched?.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GUEST DETAILS MODAL */}
      {showProfilePromptModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowProfilePromptModal(false)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 bg-zinc-100 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 flex items-center justify-center rounded-2xl mb-4">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-1">{t.yourDetails}</h3>
            <p className="text-zinc-500 font-medium text-xs mb-5">{t.detailsSubtitle}</p>
            
            <form onSubmit={handleGuestBook} className="space-y-4">
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
                onClick={handleServicesConfirmed}
                disabled={isBooking || (services.length > 0 && selectedServices.length === 0)}
                className="w-full h-14 bg-zinc-900 disabled:bg-zinc-300 active:bg-black text-white font-bold rounded-xl transition-all text-lg flex justify-center items-center gap-2"
              >
                {`${t.confirmAndJoin} ${selectedServices.length > 0 ? `(${selectedServices.length})` : ''}`} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}