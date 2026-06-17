'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Bell, Coffee, LogOut, Copy, Check, UserX, CheckCircle2, UserPlus, X, Download, Power, MapPin, UploadCloud, Settings, Save, Smartphone, Store, User, ArrowRight, Timer } from 'lucide-react';

type Customer = {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  notified?: boolean;
  alerted_at?: string;
  is_confirmed?: boolean;
  customers?: { full_name: string; phone_number: string };
};

// NEW: Helper to format the countdown timer
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function Dashboard() {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  
  // State for Google Users who need to complete their profile
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardShopName, setOnboardShopName] = useState('');
  const [onboardOwnerName, setOnboardOwnerName] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [isSendingAuth, setIsSendingAuth] = useState<string | null>(null); 
  const [shopName, setShopName] = useState<string>(''); 
  const [ownerName, setOwnerName] = useState<string>(''); 
  const [barberId, setBarberId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isToggling, setIsToggling] = useState(false);

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [isAddingWalkIn, setIsAddingWalkIn] = useState(false);

  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [uploadingImage, setUploadingImage] = useState(false);

  // NEW: State to hold the live countdown timers for each customer
  const [timers, setTimers] = useState<Record<string, number>>({});

  const router = useRouter();

  // MAGIC UX: Memory reference to track who already "dinged"
  const confirmedIds = useRef<Set<string>>(new Set());

  // NEW: Effect to tick down the timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (next[id] > 0) next[id] -= 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // SEPARATED FETCH QUEUE FUNCTION FOR THE AUTO-REFRESH
  const fetchQueueOnly = async (bId: string) => {
    const { data, error } = await supabase
      .from('queue')
      .select('*, customers(full_name, phone_number)') 
      .eq('barber_id', bId) 
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true }); 

    if (!error && data) {
      let shouldPlaySound = false;

      // Check if anyone NEW has confirmed
      data.forEach(customer => {
        if (customer.is_confirmed && !confirmedIds.current.has(customer.id)) {
          shouldPlaySound = true;
          confirmedIds.current.add(customer.id); // Remember them so we don't beep again
        }

        // NEW: Initialize timers for clients who were alerted but haven't confirmed yet
        if (customer.alerted_at && !customer.is_confirmed && !timers[customer.id]) {
          const elapsed = Math.floor((new Date().getTime() - new Date(customer.alerted_at).getTime()) / 1000);
          const remaining = Math.max(0, 600 - elapsed); // 10 minutes (600s)
          setTimers(prev => ({ ...prev, [customer.id]: remaining }));
        }
      });

      // Play the magical ding!
      if (shouldPlaySound) {
        const audio = new Audio('/ding.mp3');
        audio.play().catch(e => console.log("Audio blocked by browser:", e));
      }

      setQueue(data);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);

    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      
      setUserId(session.user.id);

      const { data: barber } = await supabase.from('barbers').select('*').eq('user_id', session.user.id).single();

      if (!barber) {
        setNeedsOnboarding(true);
        setIsLoading(false);
        return;
      }

      if (barber.approval_status === 'pending') {
        setIsApproved(false);
        setIsLoading(false);
        return;
      }

      setIsApproved(true);
      setShopName(barber.shop_name);
      setOwnerName(barber.owner_name); 
      setBarberId(barber.id);
      setIsOpen(barber.is_open ?? true); 
      setLocation(barber.location || '');
      setProfileImage(barber.profile_image_url || '');

      await fetchQueueOnly(barber.id);
      setIsLoading(false);
    };

    checkAuthAndFetchData();
  }, []);

  // UBER METHOD: 5-SECOND AUTO REFRESH
  useEffect(() => {
    if (!barberId) return;
    const interval = setInterval(() => {
      fetchQueueOnly(barberId);
    }, 5000);
    return () => clearInterval(interval);
  }, [barberId]);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsOnboarding(true);
    const toastId = toast.loading("Création de votre salon...");

    const { error } = await supabase.from('barbers').insert([{
      user_id: userId,
      shop_name: onboardShopName,
      owner_name: onboardOwnerName,
      approval_status: 'pending'
    }]);

    if (error) {
      toast.error("Erreur lors de la création.", { id: toastId });
    } else {
      toast.success("Profil complété !", { id: toastId });
      setNeedsOnboarding(false);
    }
    setIsOnboarding(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !barberId) return;
      setUploadingImage(true);
      const toastId = toast.loading("Téléchargement de la photo...", { style: { borderRadius: '12px' } });
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${barberId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('barber_profiles')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('barber_profiles')
        .getPublicUrl(fileName);

      setProfileImage(publicUrl);
      
      await supabase.from('barbers').update({ profile_image_url: publicUrl }).eq('id', barberId);

      toast.success("Photo ajoutée avec succès !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId) return;
    setIsSavingProfile(true);
    const toastId = toast.loading("Mise à jour du lien...", { style: { borderRadius: '12px' }});

    const { error } = await supabase.from('barbers').update({ location: location }).eq('id', barberId);

    if (!error) {
      toast.success("Lien mis à jour !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    } else {
      toast.error("Erreur de mise à jour.", { id: toastId });
    }
    setIsSavingProfile(false);
  };

  const toggleShopStatus = async () => {
    if (!barberId) return;
    setIsToggling(true);
    
    const newStatus = !isOpen;
    const { error } = await supabase.from('barbers').update({ is_open: newStatus }).eq('id', barberId);

    if (!error) {
      setIsOpen(newStatus);
      if (newStatus) {
        toast.success("Le salon est ouvert !", { icon: '🟢', style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
      } else {
        toast("Le salon est fermé !", { icon: '🔴', style: { borderRadius: '12px', background: '#334155', color: '#fff' }});
      }
    } else {
      toast.error("Erreur lors du changement de statut.");
    }
    setIsToggling(false);
  };

  const handleComplete = async (customerId: string) => {
    const { error } = await supabase.from('queue').update({ status: 'completed' }).eq('id', customerId);
    if (!error) {
      setQueue(prev => prev.filter(c => c.id !== customerId));
      toast.success("Client terminé !", { icon: '✨', style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    } else {
      toast.error("Erreur de mise à jour.");
    }
  };

  const handleCancel = async (customerId: string) => {
    const { error } = await supabase.from('queue').update({ status: 'cancelled' }).eq('id', customerId);
    if (!error) {
      setQueue(prev => prev.filter(c => c.id !== customerId));
      toast.success("Client retiré.", { icon: '👋', style: { borderRadius: '12px', background: '#333', color: '#fff' }});
    } else {
      toast.error("Erreur d'annulation.");
    }
  };

  const handleNotify = async (customer: Customer) => {
    setIsSendingAuth(customer.id);
    const toastId = toast.loading("Alerte en cours...", { style: { borderRadius: '12px' }}); 
    
    try {
      const sendName = customer.customers?.full_name || customer.customer_name;

      const { error } = await supabase.from('queue').update({ 
        alerted_at: new Date().toISOString(),
        notified: true 
      }).eq('id', customer.id);

      if (error) throw error;

      // NEW: Start the 10-minute timer locally
      setTimers(prev => ({ ...prev, [customer.id]: 600 })); 

      toast.success(`Alerte envoyée sur l'app à ${sendName.split(' ')[0]} !`, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      if (barberId) fetchQueueOnly(barberId); // Instant refresh
      
    } catch (error) {
      toast.error("Erreur réseau.", { id: toastId });
    } finally {
      setIsSendingAuth(null);
    }
  };

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !barberId) return;
    
    setIsAddingWalkIn(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const { data, error } = await supabase.from('queue').insert([{
      barber_id: barberId,
      customer_name: walkInName,
      whatsapp_number: 'Sur place',
      status: 'waiting'
    }]).select();

    if (error) {
      toast.error("Erreur d'ajout.", { id: toastId });
    } else if (data) {
      setQueue(prev => [...prev, data[0]]);
      toast.success("Client ajouté !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
      setShowWalkInModal(false);
      setWalkInName('');
    }
    setIsAddingWalkIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Lien copié !", { style: { borderRadius: '12px', background: '#333', color: '#fff' }});
    setTimeout(() => setCopied(false), 2000);
  };

  const shopSlug = ownerName ? ownerName.toLowerCase().replace(/\s+/g, '-') : 'salon';
  const shareLink = origin && barberId ? `${origin}/q/${barberId}` : '';
  const qrCodeUrl = shareLink ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shareLink)}&color=0f172a&bgcolor=ffffff` : '';

  const downloadQR = async () => {
    const toastId = toast.loading("Création de votre affiche VIP...", { style: { borderRadius: '12px' }});
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const imgUrl = window.URL.createObjectURL(blob);

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 55px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(shopName.toUpperCase(), 400, 150);

        ctx.fillStyle = '#d97706'; 
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.fillText("FILE D'ATTENTE NUMÉRIQUE", 400, 210);

        const qrSize = 500;
        ctx.drawImage(img, 150, 270, qrSize, qrSize);

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.fillText("Scannez ce code pour prendre votre place", 400, 850);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px system-ui, sans-serif';
        ctx.fillText("Propulsé par Noubba", 400, 920);

        const link = document.createElement('a');
        link.download = `Affiche-Noubba-${shopSlug}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        window.URL.revokeObjectURL(imgUrl);
        toast.success("Affiche téléchargée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
      };
      img.src = imgUrl;
    } catch (error) {
      toast.error("Erreur de téléchargement.", { id: toastId });
    }
  };

  // Google Onboarding Screen
  if (!isLoading && needsOnboarding) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans">
        <div className="h-[30vh] w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
          <div className="relative z-10 mt-4">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Bienvenue !</h1>
            <p className="text-slate-400 font-medium text-sm">Complétez votre profil pour ouvrir votre salon.</p>
          </div>
        </div>
        <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-6 pt-10 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <form id="onboard-form" onSubmit={handleCompleteOnboarding} className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><Store className="w-5 h-5 text-slate-400" /></div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Nom du Salon</label>
                <input type="text" required value={onboardShopName} onChange={(e) => setOnboardShopName(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Barber Pro" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><User className="w-5 h-5 text-slate-400" /></div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Votre Prénom</label>
                <input type="text" required value={onboardOwnerName} onChange={(e) => setOnboardOwnerName(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Tariq" />
              </div>
            </div>
          </form>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
          <button type="submit" form="onboard-form" disabled={isOnboarding} className="w-full h-16 bg-amber-500 active:bg-amber-400 disabled:bg-slate-300 text-slate-900 font-black rounded-2xl transition-colors text-lg flex justify-center items-center gap-2">
            {isOnboarding ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div> : <>Terminer <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && !isApproved && !needsOnboarding) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6 text-center selection:bg-amber-500/30">
        <div className="bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-slate-700 max-w-md w-full animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300"></div>
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Coffee className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Compte en attente</h2>
          <p className="text-slate-400 mb-8 font-medium">Votre compte est en cours d'activation par l'administrateur. Veuillez revenir plus tard.</p>
          <button onClick={handleLogout} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
      
      {/* NATIVE HERO SECTION (Edge to Edge) */}
      <div className="min-h-[32vh] pt-12 pb-8 w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        {/* Floating Actions Top - Moved down for Notch safety */}
        <div className="absolute top-4 sm:top-6 w-full left-0 px-4 flex justify-between items-center z-20">
          <button 
            onClick={toggleShopStatus}
            disabled={isToggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 backdrop-blur-md ${
              isOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-slate-300 border border-white/20'
            }`}
          >
            <Power className="w-4 h-4 shrink-0" /> <span className="truncate">{isOpen ? 'Salon Ouvert' : 'Salon Fermé'}</span>
          </button>
          
          <button onClick={handleLogout} className="w-10 h-10 shrink-0 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Info - Added margin and text truncation */}
        <div className="relative z-10 mt-12 flex items-center gap-4">
          {profileImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={profileImage} alt="Profile" className="w-16 h-16 shrink-0 rounded-full object-cover border-2 border-white/20 shadow-lg" />
          ) : (
            <div className="w-16 h-16 shrink-0 bg-slate-800 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg">
              <span className="text-2xl font-black text-amber-500">{shopName ? shopName.charAt(0).toUpperCase() : 'S'}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1 truncate">
              Bonjour, {ownerName ? ownerName.split(' ')[0] : ''}
            </h1>
            <p className="text-slate-400 font-medium text-sm truncate">{shopName}</p>
          </div>
        </div>
      </div>

      {/* OVERLAPPING BOTTOM SHEET */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 sm:px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">

        {/* Queue Header */}
        <div className="flex justify-between items-end mb-6 px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">File d'attente</h2>
            <p className="text-sm font-bold text-amber-600 mt-1">{queue.length} personne(s) en attente</p>
          </div>
        </div>

        {/* Queue List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-32 w-full"></div>
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">La file est vide</h3>
            <p className="text-sm text-slate-500 font-medium">En attente de clients...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((customer, index) => {
              // UBER METHOD: SMART UI STATES
              const isAlerted = !!customer.alerted_at;
              const isConfirmed = customer.is_confirmed;
              const displayName = customer.customers?.full_name || customer.customer_name;
              const displayPhone = customer.customers?.phone_number || customer.whatsapp_number;
              const timeRemaining = timers[customer.id] || 0;

              return (
                <div 
                  key={customer.id} 
                  className={`p-5 rounded-[2rem] shadow-sm flex flex-col gap-4 transition-all duration-500 ${
                    isConfirmed 
                      ? 'bg-emerald-50/40 border-2 border-emerald-400 shadow-emerald-500/10' 
                      : isAlerted 
                        ? 'bg-orange-50/40 border-2 border-orange-300 shadow-orange-500/10' 
                        : 'bg-white border border-slate-100'
                  }`}
                >
                  
                  {/* Customer Info Row */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isConfirmed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : isAlerted ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-amber-50 border-amber-100/50 text-amber-600'
                      }`}>
                        <span className="font-black text-lg">#{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 capitalize leading-tight">{displayName}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          {displayPhone === 'Sur place' ? (
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Sur Place</span>
                          ) : (
                            <>
                              <Smartphone className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-500 font-mono text-xs font-medium">{displayPhone}</span>
                            </>
                          )}
                          
                          {/* UBER METHOD BADGES */}
                          {isConfirmed && (
                            <span className="ml-1 flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-300">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" /> En route
                            </span>
                          )}
                          {isAlerted && !isConfirmed && (
                            <span className="ml-1 flex items-center text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full animate-pulse">
                              <Timer className="w-3 h-3 mr-0.5" /> En attente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thumb-friendly Action Buttons */}
                  <div className="flex flex-col gap-2 w-full mt-1">
                    
                    {/* NEW: Dynamic Timer/Alert Button Logic */}
                    {displayPhone !== 'Sur place' && (
                      <>
                        {isConfirmed ? (
                          <div className="w-full h-12 bg-emerald-100 text-emerald-700 border border-emerald-200 font-black rounded-xl transition-all flex items-center justify-center gap-2 mb-1">
                            <CheckCircle2 className="w-5 h-5" /> Le client est en route !
                          </div>
                        ) : isAlerted ? (
                          <button disabled className={`w-full h-12 mb-1 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${timeRemaining > 0 ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                            <Timer className="w-5 h-5" /> {timeRemaining > 0 ? formatTime(timeRemaining) : "Temps écoulé"}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleNotify(customer)} 
                            disabled={isSendingAuth === customer.id} 
                            className="w-full h-12 mb-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                          >
                            {isSendingAuth === customer.id ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <><Bell className="w-4 h-4 text-amber-400" /> Alerter le client (App)</>
                            )}
                          </button>
                        )}
                      </>
                    )}

                    <div className="flex gap-2 w-full">
                      <button onClick={() => handleComplete(customer.id)} className={`flex-1 h-12 flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-[0.98] text-sm ${isConfirmed ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                        <Check className="w-4 h-4" /> Terminé
                      </button>
                      <button onClick={() => handleCancel(customer.id)} className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-50 text-slate-500 hover:bg-slate-100 font-bold rounded-xl transition-all active:scale-[0.98] text-sm border border-slate-100">
                        <UserX className="w-4 h-4" /> Absent
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* NATIVE SETTINGS SECTION */}
        <div className="mt-12 pt-8 border-t border-slate-200/60">
          <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" /> Outils du Salon
          </h2>

          <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              
              {/* Native Input: Image */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all relative overflow-hidden flex items-center gap-4">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                  {profileImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profileImage} alt="Salon" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <UploadCloud className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Photo Profil</label>
                  <p className="text-sm font-bold text-slate-900">{uploadingImage ? 'Téléchargement...' : 'Appuyez pour modifier'}</p>
                </div>
              </div>

              {/* Native Input: Maps */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lien Google Maps</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <input type="url" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="http://maps.google.com/..." className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 placeholder-slate-400 focus:ring-0 outline-none" />
                </div>
              </div>

              <button type="submit" disabled={isSavingProfile} className="w-full h-12 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2">
                <Save className="w-4 h-4 text-amber-400" /> Enregistrer les infos
              </button>
            </form>
          </div>

          {/* NATIVE VIP POSTER CARD */}
          {!isLoading && shareLink && (
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="flex items-center gap-5 relative z-10 mb-6">
                <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded-xl" crossOrigin="anonymous" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">Affiche QR Code</h3>
                  <p className="text-slate-400 text-xs font-medium mt-0.5">Pour vos clients au salon</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-3">
                <button onClick={downloadQR} className="w-full h-12 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Télécharger l'Affiche
                </button>
                <button onClick={() => copyToClipboard(shareLink)} className="w-full h-12 bg-white/10 active:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                  {copied ? 'Lien Copié !' : 'Copier le lien direct'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Walk-in Modal */}
        {showWalkInModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowWalkInModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-slate-900 text-amber-400 flex items-center justify-center rounded-2xl mb-4 shadow-sm">
                <UserPlus className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Ajouter sur place</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">Ajoutez rapidement une personne au salon.</p>
              
              <form onSubmit={handleAddWalkIn}>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition-all mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Prénom du client</label>
                  <input type="text" autoFocus required value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Ex: Karim" />
                </div>
                <button type="submit" disabled={isAddingWalkIn || !walkInName.trim()} className="w-full h-14 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] disabled:opacity-50 text-lg flex items-center justify-center gap-2">
                  {isAddingWalkIn ? 'Ajout...' : 'Ajouter à la file'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-40 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setShowWalkInModal(true)}
          className="w-full h-16 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-2xl transition-colors text-lg flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20"
        >
          <UserPlus className="w-5 h-5 text-amber-400" /> Ajouter Sur Place
        </button>
      </div>

    </div>
  );
}