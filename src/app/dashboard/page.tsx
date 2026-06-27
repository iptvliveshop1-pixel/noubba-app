'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { Bell, Coffee, LogOut, Copy, Check, UserX, CheckCircle2, UserPlus, X, Download, Power, MapPin, UploadCloud, Settings, Save, Smartphone, Store, User, ArrowRight, Timer, Scissors, Snowflake, BarChart3, Briefcase, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

type Customer = {
  id: string;
  customer_id?: string; 
  customer_name: string;
  whatsapp_number: string;
  alerted_at?: string;
  is_confirmed?: boolean;
  status?: string; 
  frozen_at?: string; 
  total_estimated_time?: number | null;
  customers?: { full_name: string; phone_number: string };
  queue_services?: {
    services?: {
      service_name: string;
      duration_minutes: number;
      price_dh: number;
    }
  }[];
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function Dashboard() {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [frozenQueue, setFrozenQueue] = useState<Customer[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  
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

  // ✨ NEW: Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);

  const [newStaffName, setNewStaffName] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [timers, setTimers] = useState<Record<string, number>>({});
  const router = useRouter();
  const confirmedIds = useRef<Set<string>>(new Set());

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

  const fetchQueueOnly = async (bId: string) => {
    const { data, error } = await supabase
      .from('queue')
      .select(`
        *, 
        customers(full_name, phone_number),
        queue_services (
          services (service_name, duration_minutes, price_dh)
        )
      `) 
      .eq('barber_id', bId) 
      .in('status', ['waiting', 'frozen'])
      .order('joined_at', { ascending: true }); 

    if (!error && data) {
      let shouldPlaySound = false;
      
      const activeClients = data.filter(c => c.status === 'waiting');
      const frozenClients = data.filter(c => c.status === 'frozen');

      activeClients.forEach(customer => {
        if (customer.is_confirmed && !confirmedIds.current.has(customer.id)) {
          shouldPlaySound = true;
          confirmedIds.current.add(customer.id); 
        }

        if (customer.alerted_at && !customer.is_confirmed && !timers[customer.id]) {
          const elapsed = Math.floor((new Date().getTime() - new Date(customer.alerted_at).getTime()) / 1000);
          const remaining = Math.max(0, 600 - elapsed); 
          setTimers(prev => ({ ...prev, [customer.id]: remaining }));
        }
      });

      if (shouldPlaySound) {
        const audio = new Audio('/ding.mp3');
        audio.play().catch(e => console.log("Audio blocked by browser:", e));
      }

      setQueue(activeClients as Customer[]);
      setFrozenQueue(frozenClients as Customer[]);
    }
  };

  // ✨ NEW: Fetch Services and Staff
  const fetchSettingsData = async (bId: string) => {
    const { data: sData } = await supabase.from('services').select('*').eq('barber_id', bId).order('created_at', { ascending: true });
    if (sData) setServices(sData);

    const { data: stData } = await supabase.from('staff').select('*').eq('barber_id', bId).order('created_at', { ascending: true });
    if (stData) setStaff(stData);
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
      await fetchSettingsData(barber.id); // Fetch for settings modal
      setIsLoading(false);
    };

    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    if (!barberId) return;
    const interval = setInterval(() => {
      fetchQueueOnly(barberId);
    }, 5000);
    return () => clearInterval(interval);
  }, [barberId]);

  // ✨ NEW: Service Management Handlers
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServiceDuration || !newServicePrice || !barberId) return;
    
    setIsAddingService(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const { data, error } = await supabase.from('services').insert([{
      barber_id: barberId,
      service_name: newServiceName,
      duration_minutes: parseInt(newServiceDuration),
      price_dh: parseInt(newServicePrice)
    }]).select();

    if (!error && data) {
      setServices(prev => [...prev, data[0]]);
      setNewServiceName('');
      setNewServiceDuration('');
      setNewServicePrice('');
      toast.success("Prestation ajoutée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    } else {
      toast.error("Erreur d'ajout.", { id: toastId });
    }
    setIsAddingService(false);
  };

  const handleDeleteService = async (id: string) => {
    const confirm = window.confirm("Supprimer cette prestation ?");
    if (!confirm) return;

    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) {
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success("Prestation supprimée !", { style: { borderRadius: '12px', background: '#333', color: '#fff' }});
    }
  };

  // ✨ NEW: Staff Management Handlers
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !barberId) return;
    
    setIsAddingStaff(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const { data, error } = await supabase.from('staff').insert([{
      barber_id: barberId,
      name: newStaffName,
      is_available: true
    }]).select();

    if (!error && data) {
      setStaff(prev => [...prev, data[0]]);
      setNewStaffName('');
      toast.success("Membre ajouté !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    } else {
      toast.error("Erreur d'ajout.", { id: toastId });
    }
    setIsAddingStaff(false);
  };

  const handleToggleStaffAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('staff').update({ is_available: !currentStatus }).eq('id', id);
    if (!error) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, is_available: !currentStatus } : s));
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const confirm = window.confirm("Supprimer ce membre de l'équipe ?");
    if (!confirm) return;

    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) {
      setStaff(prev => prev.filter(s => s.id !== id));
      toast.success("Membre supprimé !", { style: { borderRadius: '12px', background: '#333', color: '#fff' }});
    }
  };

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
      if (barberId) fetchQueueOnly(barberId);
      toast.success("Coupe terminée !", { icon: '✨', style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    } else {
      toast.error("Erreur de mise à jour.");
    }
  };

  const handleFreeze = async (customerId: string) => {
    const toastId = toast.loading("Mise en pause...", { style: { borderRadius: '12px' }});
    const { error } = await supabase.from('queue').update({ 
      status: 'frozen',
      frozen_at: new Date().toISOString(),
      alerted_at: null, 
      is_confirmed: false
    }).eq('id', customerId);

    if (!error) {
      if (barberId) fetchQueueOnly(barberId);
      toast.success("Client mis en pause.", { id: toastId, icon: '❄️', style: { borderRadius: '12px', background: '#3b82f6', color: '#fff' }});
    } else {
      toast.error("Erreur.", { id: toastId });
    }
  };

  const handleUnfreeze = async (customerId: string) => {
    const toastId = toast.loading("Réactivation...", { style: { borderRadius: '12px' }});
    const { error } = await supabase.from('queue').update({ 
      status: 'waiting',
      frozen_at: null
    }).eq('id', customerId);

    if (!error) {
      if (barberId) fetchQueueOnly(barberId);
      toast.success("Client réactivé !", { id: toastId, icon: '🔥', style: { borderRadius: '12px', background: '#f59e0b', color: '#fff' }});
    } else {
      toast.error("Erreur.", { id: toastId });
    }
  };

  const handleHardCancel = async (customerId: string) => {
    const confirm = window.confirm("Supprimer définitivement ce client de la file ?");
    if (!confirm) return;

    const { error } = await supabase.from('queue').update({ status: 'cancelled' }).eq('id', customerId);
    if (!error) {
      if (barberId) fetchQueueOnly(barberId);
      toast("Client retiré.", { icon: '👋', style: { borderRadius: '12px', background: '#333', color: '#fff' }});
    }
  };

  const handleNotify = async (customer: Customer) => {
    setIsSendingAuth(customer.id);
    const toastId = toast.loading("Alerte en cours...", { style: { borderRadius: '12px' }}); 
    
    try {
      const sendName = customer.customers?.full_name || customer.customer_name;

      const { error } = await supabase.from('queue').update({ 
        alerted_at: new Date().toISOString()
      }).eq('id', customer.id);

      if (error) throw error;

      setTimers(prev => ({ ...prev, [customer.id]: 600 })); 

      if (customer.customer_id) {
        fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customer.customer_id,
            title: "C'est bientôt à vous ! ✂️",
            body: `Le salon ${shopName} vous attend. Cliquez ici pour confirmer !`
          })
        }).catch(err => console.error("Push API failed:", err));
      }

      toast.success(`Alerte envoyée sur l'app à ${sendName.split(' ')[0]} !`, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      if (barberId) fetchQueueOnly(barberId); 
      
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
    }]).select(`*, customers(full_name, phone_number), queue_services(services(service_name, duration_minutes, price_dh))`);

    if (error) {
      toast.error("Erreur d'ajout.", { id: toastId });
    } else if (data) {
      setQueue(prev => [...prev, data[0] as Customer]);
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
    const toastId = toast.loading("Création de l'affiche...", { style: { borderRadius: '12px' }});
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
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><Store className="w-5 h-5 text-slate-400" /></div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Nom du Salon</label>
                <input type="text" required value={onboardShopName} onChange={(e) => setOnboardShopName(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Barber Pro" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0"><User className="w-5 h-5 text-slate-400" /></div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Votre Prénom</label>
                <input type="text" required value={onboardOwnerName} onChange={(e) => setOnboardOwnerName(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Tariq" />
              </div>
            </div>
          </form>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-8">
          <button type="submit" form="onboard-form" disabled={isOnboarding} className="w-full h-16 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-2xl transition-colors text-lg flex justify-center items-center gap-2">
            {isOnboarding ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div> : <>Terminer <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && !isApproved && !needsOnboarding) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="bg-slate-800 p-10 rounded-[2.5rem] shadow-2xl border border-slate-700 max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300"></div>
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Coffee className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Compte en attente</h2>
          <p className="text-slate-400 mb-8 font-medium">Votre compte est en cours d'activation par l'administrateur.</p>
          <button onClick={handleLogout} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
      
      <div className="min-h-[32vh] pt-12 pb-8 w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
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

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 sm:px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">

        <div className="flex justify-between items-end mb-6 px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">File d'attente</h2>
            <p className="text-sm font-bold text-amber-600 mt-1">{queue.length} personne(s) en attente</p>
          </div>
        </div>

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
              const isAlerted = !!customer.alerted_at;
              const isConfirmed = customer.is_confirmed;
              const displayName = customer.customers?.full_name || customer.customer_name;
              const displayPhone = customer.customers?.phone_number || customer.whatsapp_number;
              const timeRemaining = timers[customer.id] || 0;

              if (index === 0) {
                return (
                  <div key={customer.id} className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl shadow-slate-900/10 border border-slate-800 relative overflow-hidden transition-all duration-500">
                    <div className="absolute -right-8 -bottom-8 opacity-[0.05] pointer-events-none">
                      <Scissors className="w-48 h-48" />
                    </div>
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                          <Scissors className="w-6 h-6 text-slate-900 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-1 block">Sur le fauteuil</span>
                          <h3 className="text-xl font-black text-white capitalize leading-tight">{displayName}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            {displayPhone === 'Sur place' ? (
                              <span className="bg-white/10 text-slate-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Sur Place</span>
                            ) : (
                              <>
                                <Smartphone className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-400 font-mono text-xs font-medium">{displayPhone}</span>
                              </>
                            )}
                          </div>
                          
                          {customer.queue_services && customer.queue_services.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {customer.queue_services.map((qs, i) => qs.services && (
                                <span key={i} className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                  {qs.services.service_name}
                                </span>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full mt-6 relative z-10">
                      <button onClick={() => handleComplete(customer.id)} className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                        <Check className="w-5 h-5" /> Terminer la coupe
                      </button>
                      <button onClick={() => handleFreeze(customer.id)} className="w-14 h-14 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center shrink-0 border border-white/10" title="Mettre en pause (Absent)">
                        <UserX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              }

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
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isConfirmed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : isAlerted ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-slate-100 border-slate-200 text-slate-600'
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

                        {(customer.queue_services?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {customer.total_estimated_time && (
                              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <Timer className="w-3 h-3" /> {customer.total_estimated_time} min
                              </span>
                            )}
                            {customer.queue_services?.map((qs, i) => qs.services && (
                              <span key={i} className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                {qs.services.service_name}
                              </span>
                            ))}
                          </div>
                        )}
                        
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full mt-1">
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
                      <button onClick={() => handleFreeze(customer.id)} className="flex-1 h-12 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl transition-all active:scale-[0.98] text-sm border border-blue-100">
                        <Snowflake className="w-4 h-4" /> Pause (Absent)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {frozenQueue.length > 0 && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Snowflake className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Clients en pause</h2>
            </div>
            <div className="space-y-3">
              {frozenQueue.map(customer => (
                <div key={customer.id} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 capitalize">{customer.customers?.full_name || customer.customer_name}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Mis en pause</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUnfreeze(customer.id)} className="h-10 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl text-sm transition-colors active:scale-95">
                      Réactiver
                    </button>
                    <button onClick={() => handleHardCancel(customer.id)} className="h-10 px-3 bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-xl transition-colors active:scale-95" title="Supprimer définitivement">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-slate-200/60">
          <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" /> Outils du Salon
          </h2>

          <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                
                {/* ✨ NEW: Management Settings Button */}
                <button 
                  onClick={() => setShowSettingsModal(true)} 
                  className="w-full h-12 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-3"
                >
                  <Briefcase className="w-4 h-4 text-amber-500" /> Gérer Prestations & Équipe
                </button>

                <Link href="/barber/analytics" className="w-full h-12 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                  <BarChart3 className="w-4 h-4 text-blue-500" /> Voir les statistiques du jour
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* WALK IN MODAL */}
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

        {/* ✨ NEW: SETTINGS MANAGEMENT MODAL */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg h-[90vh] sm:h-[85vh] shadow-2xl relative flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 overflow-hidden">
              
              <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 z-10 shadow-sm">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gestion du Salon</h3>
                  <p className="text-slate-500 font-medium text-sm">Modifiez vos services et votre équipe</p>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                {/* SERVICES SECTION */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Scissors className="w-5 h-5 text-amber-500" />
                    <h4 className="text-lg font-black text-slate-900">Vos Prestations</h4>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
                    <form onSubmit={handleAddService} className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom du service</label>
                        <input type="text" required value={newServiceName} onChange={(e)=>setNewServiceName(e.target.value)} placeholder="Ex: Coupe Standard" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Durée (min)</label>
                        <input type="number" required min="1" value={newServiceDuration} onChange={(e)=>setNewServiceDuration(e.target.value)} placeholder="30" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Prix (DH)</label>
                        <input type="number" required min="0" value={newServicePrice} onChange={(e)=>setNewServicePrice(e.target.value)} placeholder="50" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors" />
                      </div>
                      <button type="submit" disabled={isAddingService} className="col-span-2 h-12 bg-slate-900 text-white font-bold rounded-xl mt-1 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all">
                        <Plus className="w-4 h-4 text-amber-400" /> {isAddingService ? 'Ajout...' : 'Ajouter la prestation'}
                      </button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    {services.map(service => (
                      <div key={service.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">{service.service_name}</p>
                          <p className="text-xs font-bold text-slate-400">{service.duration_minutes} min • {service.price_dh} DH</p>
                        </div>
                        <button onClick={() => handleDeleteService(service.id)} className="w-10 h-10 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <hr className="border-slate-200/60" />

                {/* STAFF SECTION */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-blue-500" />
                    <h4 className="text-lg font-black text-slate-900">Votre Équipe</h4>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
                    <form onSubmit={handleAddStaff} className="flex gap-3">
                      <div className="flex-1">
                        <input type="text" required value={newStaffName} onChange={(e)=>setNewStaffName(e.target.value)} placeholder="Prénom du coiffeur" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors" />
                      </div>
                      <button type="submit" disabled={isAddingStaff} className="h-12 px-5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shrink-0">
                        <Plus className="w-4 h-4 text-amber-400" />
                      </button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    {staff.map(member => (
                      <div key={member.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">{member.name}</p>
                          <p className={`text-xs font-bold ${member.is_available ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {member.is_available ? 'Disponible' : 'Absent'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleToggleStaffAvailability(member.id, member.is_available)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${member.is_available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {member.is_available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={() => handleDeleteStaff(member.id)} className="w-10 h-10 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>
            </div>
          </div>
        )}

      </div>

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