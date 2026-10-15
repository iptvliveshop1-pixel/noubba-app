'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LogOut, Scissors, MapPin, Timer, CheckCircle2, AlertCircle, X, Store, QrCode, Camera, Clock, Star, Award, User, Snowflake, Globe, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

const translations = {
  fr: {
    welcome: "Bonjour",
    personalSpace: "Votre espace personnel Noubba",
    defaultClient: "Client",
    haircutCompleted: "Coupe Terminée !",
    reviewPrompt: "Comment s'est passée votre visite chez",
    sendAndEarn: "Envoyer et gagner 1 point",
    sendingReview: "Envoi en cours...",
    skipReview: "Ignorer pour cette fois",
    reviewSuccess: "Avis envoyé ! +1 Point de fidélité 🎁",
    scanTitle: "Scanner un Salon",
    scanFrame: "Placez le QR Code dans le cadre",
    scanSuccess: "Salon trouvé ! Ouverture...",
    scanInvalid: "Ce QR Code n'est pas valide pour Noubba.",
    usualBarber: "Votre salon habituel",
    loyaltyPoints: "point(s) de fidélité",
    joinQueue: "Prendre ma place",
    noActiveQueue: "Aucune file en cours",
    takeSpotPrompt: "Prenez votre place rapidement !",
    newSalonTitle: "Nouveau salon ?",
    newSalonSubtitle: "Scannez le code du coiffeur pour rejoindre sa file d'attente.",
    scanQrBtn: "Scanner un QR Code",
    spotPausedTitle: "Place en pause",
    spotPausedDesc: "Votre place a été mise en pause par le coiffeur. Présentez-vous au salon pour la réactiver.",
    leaveQueue: "Quitter la file",
    leftQueueMsg: "Vous avez quitté la file.",
    turnAlertMsg: "C'est bientôt à vous ! Confirmez votre arrivée ci-dessous.",
    withStaff: "Vous êtes avec",
    yourPosition: "Votre Position",
    nextInLine: "Vous êtes le prochain !",
    yourTurn: "C'est votre tour !",
    selectedServices: "Prestations choisies",
    total: "Total",
    currency: "DH",
    viewOnMap: "Voir sur la carte",
    onMyWayBtn: "Je suis en route !",
    timeExpired: "Temps écoulé !",
    barberNotified: "Coiffeur prévenu",
    barberNotifiedToast: "Le coiffeur est prévenu !",
    delayBtn: "Retard",
    delayPrompt: "Laisser passer la personne suivante ? Vous reculerez d'une place.",
    delaySuccess: "Vous avez laissé passer la personne suivante !",
    cancelSpot: "Annuler ma place",
    cancelConfirm: "Êtes-vous sûr de vouloir quitter la file d'attente ?",
    yourDetails: "Vos coordonnées",
    detailsSubtitle: "Renseignez votre nom et numéro pour que le salon puisse identifier votre ticket.",
    fullName: "Nom complet",
    fullNamePlaceholder: "Ex: Youssef Bennani",
    phoneNumber: "Numéro de téléphone",
    phonePlaceholder: "06 00 00 00 00",
    saveDetailsBtn: "Enregistrer mes infos",
    liveSynced: "En direct • File synchronisée",
    reconnecting: "Connexion faible... Reconnexion",
    syncBtn: "Actualiser",
    justNow: "À l'instant",
    savingDetails: "Enregistrement du profil...",
    detailsUpdated: "Profil mis à jour !",
    networkError: "Erreur réseau.",
    redirecting: "Redirection vers le salon...",
    confirming: "Confirmation en cours..."
  },
  en: {
    welcome: "Hello",
    personalSpace: "Your personal Noubba space",
    defaultClient: "Customer",
    haircutCompleted: "Haircut Completed!",
    reviewPrompt: "How was your visit at",
    sendAndEarn: "Submit & Earn 1 Point",
    sendingReview: "Submitting...",
    skipReview: "Skip for now",
    reviewSuccess: "Review sent! +1 Loyalty Point 🎁",
    scanTitle: "Scan a Salon",
    scanFrame: "Place the QR code inside the frame",
    scanSuccess: "Salon found! Opening...",
    scanInvalid: "This QR Code is not valid for Noubba.",
    usualBarber: "Your regular salon",
    loyaltyPoints: "loyalty point(s)",
    joinQueue: "Join Queue",
    noActiveQueue: "No active queue",
    takeSpotPrompt: "Take your spot now!",
    newSalonTitle: "Visiting a new salon?",
    newSalonSubtitle: "Scan the barber's QR code to join their queue.",
    scanQrBtn: "Scan QR Code",
    spotPausedTitle: "Queue Spot Paused",
    spotPausedDesc: "Your spot has been put on hold by the barber. Please check in at the shop to resume.",
    leaveQueue: "Leave Queue",
    leftQueueMsg: "You have left the queue.",
    turnAlertMsg: "It's almost your turn! Please confirm your arrival below.",
    withStaff: "You are with",
    yourPosition: "Your Position",
    nextInLine: "You are next in line!",
    yourTurn: "It's your turn!",
    selectedServices: "Selected Services",
    total: "Total",
    currency: "DH",
    viewOnMap: "View on map",
    onMyWayBtn: "I'm on my way!",
    timeExpired: "Time expired!",
    barberNotified: "Barber notified",
    barberNotifiedToast: "The barber has been notified!",
    delayBtn: "Delay turn",
    delayPrompt: "Let the next person go ahead? You will move back one spot.",
    delaySuccess: "You let the next person go ahead!",
    cancelSpot: "Cancel my spot",
    cancelConfirm: "Are you sure you want to leave the queue?",
    yourDetails: "Your Contact Information",
    detailsSubtitle: "Enter your name and phone number so the salon can identify your ticket.",
    fullName: "Full Name",
    fullNamePlaceholder: "Ex: Alex Miller",
    phoneNumber: "Phone Number",
    phonePlaceholder: "06 00 00 00 00",
    saveDetailsBtn: "Save My Details",
    liveSynced: "Live • Queue Synced",
    reconnecting: "Weak connection... Reconnecting",
    syncBtn: "Refresh",
    justNow: "Just now",
    savingDetails: "Saving your profile...",
    detailsUpdated: "Profile updated!",
    networkError: "Network error.",
    redirecting: "Redirecting to salon...",
    confirming: "Confirming..."
  }
};

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

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ClientDashboard() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = translations[lang];

  const [user, setUser] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [activeQueue, setActiveQueue] = useState<any>(null);
  const [recentBarber, setRecentBarber] = useState<any>(null); 
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  
  const [clientTimeRemaining, setClientTimeRemaining] = useState<number>(0);

  const [unreviewedTicket, setUnreviewedTicket] = useState<any>(null);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isDelaying, setIsDelaying] = useState(false); 
  
  const [showScanner, setShowScanner] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [lastSyncLabel, setLastSyncLabel] = useState("À l'instant");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedAlertSound = useRef(false);
  
  const router = useRouter();

  useEffect(() => {
    const savedLang = localStorage.getItem('noubba_lang');
    if (savedLang === 'en' || savedLang === 'fr') {
      setLang(savedLang);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); fetchDashboardData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const diffSec = Math.floor((new Date().getTime() - lastSyncTime.getTime()) / 1000);
      if (diffSec < 15) {
        setLastSyncLabel(lang === 'fr' ? "À l'instant" : "Just now");
      } else if (diffSec < 60) {
        setLastSyncLabel(`${diffSec}s`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setLastSyncLabel(`${diffMin}m`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lastSyncTime, lang]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setIsManualRefreshing(false), 600);
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'fr' ? 'en' : 'fr';
    setLang(nextLang);
    localStorage.setItem('noubba_lang', nextLang);
  };

  const fetchDashboardData = async () => {
    // 1. Identify active ticket from URL or device localStorage
    let guestTicketId: string | null = null;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      guestTicketId = urlParams.get('id') || localStorage.getItem('noubba_ticket_id');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      const { data: customer } = await supabase.from('customers').select('*').eq('id', session.user.id).maybeSingle();
      if (customer) {
        setCustomerName(customer.full_name);
        setProfileName(customer.full_name || '');
        setProfilePhone(customer.phone_number || '');
      } else {
        const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        if (metaName) {
          setProfileName(metaName);
          setCustomerName(metaName);
        }
      }
    }

    // 2. Fetch ticket by ID or customer_id
    let queueData: any = null;

    if (guestTicketId) {
      const { data: ticketById } = await supabase
        .from('queue')
        .select(`
          *,
          staff (name),
          queue_services(
            services(service_name, duration_minutes, price_dh)
          )
        `)
        .eq('id', guestTicketId)
        .maybeSingle();

      if (ticketById) {
        queueData = ticketById;
      }
    }

    if (!queueData && session) {
      const { data: queueDataArray } = await supabase
        .from('queue')
        .select(`
          *,
          staff (name),
          queue_services(
            services(service_name, duration_minutes, price_dh)
          )
        `)
        .eq('customer_id', session.user.id)
        .in('status', ['waiting', 'frozen'])
        .order('joined_at', { ascending: false })
        .limit(1);

      queueData = queueDataArray?.[0] || null;
    }

    if (queueData && (queueData.status === 'waiting' || queueData.status === 'frozen')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('noubba_ticket_id', queueData.id);
      }
      setCustomerName(queueData.customer_name);
      setProfileName(queueData.customer_name);
      setProfilePhone(queueData.whatsapp_number);
      setUnreviewedTicket(null);

      const { data: barberData } = await supabase
        .from('barbers')
        .select('shop_name, location, profile_image_url')
        .eq('id', queueData.barber_id)
        .single();
        
      setActiveQueue({ ...queueData, barbers: barberData || { shop_name: 'Salon' } });
      
      let positionQuery = supabase
        .from('queue')
        .select('id')
        .eq('barber_id', queueData.barber_id)
        .eq('status', 'waiting')
        .lt('joined_at', queueData.joined_at);

      if (queueData.staff_id) {
        positionQuery = positionQuery.eq('staff_id', queueData.staff_id);
      }

      const { count: aheadCount } = await positionQuery;
      const truePosition = (aheadCount || 0) + 1;
      setPosition(truePosition);

      if (queueData.alerted_at && !queueData.is_confirmed) {
        const elapsed = Math.floor((new Date().getTime() - new Date(queueData.alerted_at).getTime()) / 1000);
        let remaining = 600 - elapsed;
        remaining = Math.max(0, Math.min(600, remaining));
        setClientTimeRemaining(remaining);
      } else {
        setClientTimeRemaining(0);
      }

    } else {
      if (queueData?.status === 'completed' || queueData?.status === 'cancelled') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('noubba_ticket_id');
        }
      }
      setActiveQueue(null);
      setPosition(0);
      setClientTimeRemaining(0);

      if (queueData?.status === 'completed' && !queueData.review_left) {
        setUnreviewedTicket(queueData);
      } else if (session) {
        const { data: lastTicket } = await supabase
          .from('queue')
          .select(`
            id,
            barber_id,
            review_left,
            barbers (id, shop_name, location, profile_image_url)
          `)
          .eq('customer_id', session.user.id)
          .eq('status', 'completed')
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastTicket && !lastTicket.review_left) {
          setUnreviewedTicket(lastTicket);
        } else {
          setUnreviewedTicket(null);
        }
      }

      if (session) {
        const { data: pastTickets } = await supabase
          .from('queue')
          .select('barber_id, barbers(id, shop_name, location, profile_image_url)')
          .eq('customer_id', session.user.id)
          .eq('status', 'completed')
          .order('joined_at', { ascending: false })
          .limit(1);

        if (pastTickets && pastTickets.length > 0 && pastTickets[0].barbers) {
          setRecentBarber(pastTickets[0].barbers);

          const { data: loyaltyData } = await supabase
            .from('shop_loyalty')
            .select('*')
            .eq('customer_id', session.user.id)
            .eq('barber_id', pastTickets[0].barber_id)
            .maybeSingle();

          setLoyaltyPoints(loyaltyData?.points_balance || loyaltyData?.points || 0);
        }
      }
    }

    setLastSyncTime(new Date());
    setLastSyncLabel(lang === 'fr' ? "À l'instant" : "Just now");
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel('client-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (activeQueue?.alerted_at && !activeQueue?.is_confirmed) {
      interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - new Date(activeQueue.alerted_at).getTime()) / 1000);
        const remaining = 600 - elapsed;
        if (remaining > 0) {
          setClientTimeRemaining(remaining);
        } else {
          setClientTimeRemaining(0);
          clearInterval(interval);
        }
      }, 1000);
    } else {
      setClientTimeRemaining(0);
    }
    return () => clearInterval(interval);
  }, [activeQueue]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('custom-queue-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue', filter: `customer_id=eq.${user.id}` },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, soundEnabled]);

  const handleSubmitReview = async () => {
    if (!unreviewedTicket || ratingValue === 0) return;
    setIsSubmittingReview(true);
    const toastId = toast.loading(t.sendingReview, { style: { borderRadius: '12px' }});

    await supabase
      .from('queue')
      .update({ rating: ratingValue, review_left: true })
      .eq('id', unreviewedTicket.id);

    if (user) {
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
    }

    toast.success(t.reviewSuccess, { id: toastId, duration: 4000, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    setUnreviewedTicket(null);
    setRatingValue(0);
    setIsSubmittingReview(false);
    fetchDashboardData();
  };

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
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });
      }

      if (user && subscription) {
        await supabase
          .from('customers')
          .update({ push_subscription: subscription })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileName.trim() || !profilePhone.trim()) return;

    setIsSavingProfile(true);
    const toastId = toast.loading(t.savingDetails);
    const cleanPhone = profilePhone.replace(/\s+/g, '');

    const { data: newCustomer, error } = await supabase.from('customers').upsert([{
      id: user.id,
      full_name: profileName.trim(),
      phone_number: cleanPhone
    }]).select().single();

    if (error || !newCustomer) {
      toast.error(`Erreur: ${error?.message || t.networkError}`, { id: toastId });
      setIsSavingProfile(false);
      return;
    }

    setCustomerName(newCustomer.full_name);
    setShowProfileModal(false);
    setIsSavingProfile(false);
    toast.success(t.detailsUpdated, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
  };

  const handleJoinUsualBarber = async () => {
    if (!recentBarber) return;
    const toastId = toast.loading(t.redirecting);
    await subscribeToPush(); 
    toast.dismiss(toastId);
    router.push(`/q/${recentBarber.id}`);
  };

  const handleConfirmOnMyWay = async () => {
    if (!activeQueue) return;
    setIsConfirming(true);
    const toastId = toast.loading(t.confirming);

    const { error } = await supabase
      .from('queue')
      .update({ is_confirmed: true })
      .eq('id', activeQueue.id);

    if (!error) {
      toast.success(t.barberNotifiedToast, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      setActiveQueue({ ...activeQueue, is_confirmed: true });
    } else {
      toast.error(t.networkError, { id: toastId });
    }
    setIsConfirming(false);
  };

  const handleDelayTicket = async () => {
    if (!activeQueue || (activeQueue.delay_count || 0) >= 2) return;
    
    const confirm = window.confirm(t.delayPrompt);
    if (!confirm) return;

    setIsDelaying(true);
    const toastId = toast.loading(t.savingDetails, { style: { borderRadius: '12px' } });

    let delayQuery = supabase
      .from('queue')
      .select('joined_at')
      .eq('barber_id', activeQueue.barber_id)
      .eq('status', 'waiting')
      .gt('joined_at', activeQueue.joined_at)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (activeQueue.staff_id) {
      delayQuery = delayQuery.eq('staff_id', activeQueue.staff_id);
    }

    const { data: nextPerson } = await delayQuery.maybeSingle();

    let newJoinedAt;
    if (nextPerson) {
      newJoinedAt = new Date(new Date(nextPerson.joined_at).getTime() + 1000).toISOString();
    } else {
      newJoinedAt = new Date().toISOString();
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
      toast.success(t.delaySuccess, { id: toastId, icon: '⏱️', style: { borderRadius: '12px', background: '#f59e0b', color: '#fff' } });
      fetchDashboardData();
    } else {
      toast.error(t.networkError, { id: toastId });
    }
    setIsDelaying(false);
  };

  const handleCancelTicket = async () => {
    if (!activeQueue) return;
    const confirm = window.confirm(t.cancelConfirm);
    if (!confirm) return;

    setIsCanceling(true);
    const { error } = await supabase
      .from('queue')
      .update({ status: 'cancelled' })
      .eq('id', activeQueue.id);

    if (!error) {
      if (typeof window !== 'undefined') localStorage.removeItem('noubba_ticket_id');
      toast(t.leftQueueMsg, { icon: '👋' });
      setActiveQueue(null);
      fetchDashboardData();
    }
    setIsCanceling(false);
  };

  const handleScanSuccess = async (result: any) => {
    if (!result) return;
    
    let url = '';
    
    if (Array.isArray(result) && result.length > 0) {
      url = result[0]?.rawValue || (typeof result[0] === 'string' ? result[0] : '');
    } else if (typeof result === 'object' && result !== null && result.rawValue) {
      url = result.rawValue;
    } else if (typeof result === 'string') {
      url = result;
    }

    if (!url) return;

    if (url.includes('/q/')) {
      setShowScanner(false);
      const toastId = toast.loading(t.scanSuccess);
      await subscribeToPush(); 
      window.location.href = url;
    } else {
      if (url.trim().length > 0 && url.includes('http')) {
        toast.error(t.scanInvalid, { id: 'qr-error' });
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

      {unreviewedTicket && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">{t.haircutCompleted}</h2>
            <p className="text-slate-500 font-medium text-sm mb-6">
              {t.reviewPrompt} <span className="font-bold text-slate-900">{unreviewedTicket.barbers?.shop_name}</span> ?
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
              {isSubmittingReview ? t.sendingReview : t.sendAndEarn}
            </button>
            
            <button 
              onClick={handleSkipReview}
              className="mt-5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t.skipReview}
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-6 bg-slate-900 text-white z-10 border-b border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-blue-400" />
              <h2 className="font-black text-xl tracking-tight">{t.scanTitle}</h2>
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
              <p className="text-white mt-8 font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">{t.scanFrame}</p>
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
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="h-10 px-3 bg-white/10 border border-white/20 rounded-full flex items-center gap-1.5 text-white text-xs font-bold hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md shadow-sm"
              title="Changer de langue / Switch language"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono uppercase">{lang === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</span>
            </button>
            <button onClick={handleLogout} className="w-10 h-10 shrink-0 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1">
            {t.welcome}, {customerName ? customerName.split(' ')[0] : t.defaultClient}
          </h1>
          <p className="text-blue-200 font-medium text-sm">{t.personalSpace}</p>
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
                
                <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">{t.usualBarber}</h3>
                <p className="text-sm text-slate-500 font-bold mb-4">{recentBarber.shop_name}</p>

                {loyaltyPoints > 0 && (
                  <div className="flex items-center justify-center mb-6">
                    <div className="bg-amber-100 text-amber-600 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5">
                      <Award className="w-4 h-4" /> {loyaltyPoints} {t.loyaltyPoints}
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleJoinUsualBarber}
                  className="w-full h-14 bg-slate-900 active:bg-slate-800 hover:bg-slate-800 text-white font-black rounded-xl transition-all shadow-lg shadow-slate-900/20 text-lg flex items-center justify-center gap-2 mb-5 relative z-10"
                >
                  <Scissors className="w-5 h-5 text-amber-400" /> {t.joinQueue}
                </button>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 text-center mt-4 mb-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t.noActiveQueue}</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">{t.takeSpotPrompt}</p>
              </div>
            )}
            
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-[2rem] p-6 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">{t.newSalonTitle}</h3>
              <p className="text-sm text-slate-500 font-medium mb-5">{t.newSalonSubtitle}</p>
              <button 
                onClick={() => setShowScanner(true)}
                className="w-full h-14 bg-blue-600 active:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-600/30 text-lg flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5 text-blue-200" /> {t.scanQrBtn}
              </button>
            </div>
          </>
        ) : activeQueue.status === 'frozen' ? (
          <div className="rounded-[2rem] p-1 shadow-lg transition-colors duration-500 bg-gradient-to-b from-blue-400 to-blue-600 shadow-blue-500/20">
            <div className="bg-white rounded-[1.8rem] p-8 relative overflow-hidden text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Snowflake className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">{t.spotPausedTitle}</h2>
              <p className="text-slate-500 font-medium text-sm mb-8">
                {t.spotPausedDesc}
              </p>
              <button 
                onClick={handleCancelTicket}
                disabled={isCanceling}
                className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-5 h-5" /> {t.leaveQueue}
              </button>
            </div>
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

              {/* LIVE SYNC & REFRESH INDICATOR */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                        {t.liveSynced}
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                        {t.reconnecting}
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isManualRefreshing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold active:scale-95 transition-all"
                  title={t.syncBtn}
                >
                  <RefreshCw className={`w-3 h-3 text-slate-500 ${isManualRefreshing ? 'animate-spin text-blue-500' : ''}`} />
                  <span className="font-mono">{lastSyncLabel}</span>
                </button>
              </div>

              {activeQueue.alerted_at && !activeQueue.is_confirmed && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-bold">{t.turnAlertMsg}</p>
                </div>
              )}

              <div className="text-center border-b border-slate-100 pb-6 mb-6">
                
                {activeQueue.staff?.name && (
                  <div className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-4 py-2 rounded-xl mb-4 inline-flex items-center gap-2 shadow-sm animate-in fade-in">
                    <User className="w-4 h-4 text-blue-500" /> 
                    <span>{t.withStaff} <span className="font-black">{activeQueue.staff.name}</span></span>
                  </div>
                )}

                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{t.yourPosition}</h2>
                
                <div className="flex justify-center items-center h-24 overflow-hidden my-2">
                  <span 
                    key={position} 
                    className="text-7xl font-black text-slate-900 tracking-tighter animate-in slide-in-from-top-8 fade-in duration-500"
                  >
                    #{position}
                  </span>
                </div>
                
                {position === 2 && (
                  <div className="mt-3">
                    <p className="text-emerald-600 font-bold flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                      <CheckCircle2 className="w-4 h-4" /> {t.nextInLine}
                    </p>
                  </div>
                )}

                {position === 1 && !activeQueue.alerted_at && (
                  <div className="bg-amber-50 text-amber-600 border border-amber-200 px-4 py-2 rounded-full inline-flex items-center justify-center gap-2 mt-3 font-black animate-in zoom-in-95">
                    <Scissors className="w-4 h-4" /> {t.yourTurn}
                  </div>
                )}
              </div>

              {activeQueue.queue_services && activeQueue.queue_services.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 relative z-10">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t.selectedServices}</h3>
                  <div className="space-y-2">
                    {activeQueue.queue_services.map((qs: any, i: number) => qs.services && (
                      <div key={i} className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">{qs.services.service_name}</span>
                        <span className="font-medium text-slate-500 text-sm">{qs.services.price_dh} {t.currency}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-black text-slate-900">{t.total}</span>
                    <span className="font-black text-amber-600 text-lg">
                      {activeQueue.queue_services.reduce((total: number, qs: any) => total + (qs.services?.price_dh || 0), 0)} {t.currency}
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
                      <span className="underline underline-offset-4">{t.viewOnMap}</span>
                    </a>
                  )}
                </div>
              </div>

              {activeQueue.alerted_at && !activeQueue.is_confirmed ? (
                <button 
                  onClick={handleConfirmOnMyWay}
                  disabled={isConfirming || clientTimeRemaining === 0}
                  className={`w-full h-14 font-black rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2 mb-3 relative z-10 ${
                    clientTimeRemaining > 0 
                      ? 'bg-orange-500 active:bg-orange-600 text-white shadow-orange-500/30' 
                      : 'bg-red-500 text-white shadow-red-500/30 opacity-80 cursor-not-allowed'
                  }`}
                >
                  <Timer className="w-5 h-5" /> 
                  {clientTimeRemaining > 0 ? `${t.onMyWayBtn} (${formatTime(clientTimeRemaining)})` : t.timeExpired}
                </button>
              ) : activeQueue.is_confirmed ? (
                <div className="w-full h-14 bg-emerald-50 text-emerald-600 font-black rounded-xl border-2 border-emerald-200 flex items-center justify-center gap-2 mb-3 relative z-10">
                  <CheckCircle2 className="w-5 h-5" /> {t.barberNotified}
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
                      <Clock className="w-4 h-4" /> {t.delayBtn} ({2 - (activeQueue.delay_count || 0)})
                    </button>
                    <button 
                      onClick={handleCancelTicket}
                      disabled={isCanceling || isDelaying || isConfirming}
                      className="h-12 bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> {t.leaveQueue}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleCancelTicket}
                    disabled={isCanceling || isDelaying || isConfirming}
                    className="col-span-2 h-12 bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> {t.cancelSpot}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl mb-4 shadow-sm">
              <User className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{t.yourDetails}</h3>
            <p className="text-slate-500 font-medium text-xs mb-6">{t.detailsSubtitle}</p>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.fullName}</label>
                <input 
                  type="text" 
                  required 
                  autoFocus 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)} 
                  placeholder={t.fullNamePlaceholder} 
                  className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.phoneNumber}</label>
                <input 
                  type="tel" 
                  required 
                  value={profilePhone} 
                  onChange={(e) => setProfilePhone(e.target.value)} 
                  placeholder={t.phonePlaceholder} 
                  className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSavingProfile || !profileName.trim() || !profilePhone.trim()} 
                className="w-full h-14 bg-blue-600 active:bg-blue-700 disabled:bg-slate-300 text-white font-black rounded-2xl transition-all text-base flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isSavingProfile ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  t.saveDetailsBtn
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}