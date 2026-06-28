'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { Bell, Coffee, LogOut, Copy, Check, UserX, CheckCircle2, UserPlus, X, Download, Power, MapPin, UploadCloud, Settings, Save, Smartphone, Store, User, ArrowRight, Timer, Scissors, Snowflake, BarChart3, Briefcase, Plus, Trash2, ToggleLeft, ToggleRight, LayoutList, Image as ImageIcon } from 'lucide-react';

type Customer = {
  id: string;
  customer_id?: string; 
  customer_name: string;
  whatsapp_number: string;
  alerted_at?: string;
  is_confirmed?: boolean;
  status?: string; 
  frozen_at?: string; 
  delay_count?: number;
  total_estimated_time?: number | null;
  staff_id?: string; // ✨ NEW: Link to specific chair
  staff?: { name: string };
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

const convertToWebP = (file: File, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Serialization failed'));
          },
          'image/webp',
          quality
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function Dashboard() {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [frozenQueue, setFrozenQueue] = useState<Customer[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'queue' | 'settings'>('queue');

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
  const [selectedStaffId, setSelectedStaffId] = useState<string>(''); // ✨ NEW: Assign walk-in to chair
  const [isAddingWalkIn, setIsAddingWalkIn] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceImageUrl, setNewServiceImageUrl] = useState(''); 
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);

  const [newStaffName, setNewStaffName] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [timers, setTimers] = useState<Record<string, number>>({});
  
  const queueRef = useRef<Customer[]>([]);
  const staffRef = useRef<any[]>([]);
  const confirmedIds = useRef<Set<string>>(new Set());
  const router = useRouter();

  const handleAutoPenalty = async (customer: Customer) => {
    const newJoinedAt = new Date(new Date().getTime() + 15 * 60000).toISOString();
    
    await supabase.from('queue').update({
      joined_at: newJoinedAt,
      alerted_at: null,
      is_confirmed: false,
      delay_count: (customer.delay_count || 0) + 1
    }).eq('id', customer.id);
  
    toast.error(`${customer.customer_name} est en retard. Relégué !`, { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' }});
    if (barberId) fetchQueueOnly(barberId);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] -= 1;
            if (next[id] === 0) {
              const customer = queueRef.current.find(c => c.id === id);
              if (customer && customer.alerted_at && !customer.is_confirmed) {
                next[id] = -1; 
                handleAutoPenalty(customer);
              }
            }
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [barberId]);

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
            body: `Le salon ${shopName} vous attend. Cliquez ici pour confirmer !`
          })
        }).catch(e => console.error(e));
      }
      toast(`Alerte auto envoyée à ${customer.customer_name}`, { icon: '🤖', style: { borderRadius: '12px', background: '#334155', color: '#fff' } });
    } catch (e) {
      console.error(e);
    }
  };

  // ✨ UPGRADED: Per-Chair Sliding Window
  const triggerSlidingWindow = async (currentQueue: Customer[], currentStaff: any[]) => {
    const activeStaff = currentStaff.filter(s => s.is_available);
    
    // Analyze the queue strictly per available chair
    for (const member of activeStaff) {
      const memberQueue = currentQueue.filter(c => c.staff_id === member.id);
      const clientsToAnalyze = memberQueue.slice(0, 2); // Top 2 per chair (1 in seat, 1 on deck)

      for (const client of clientsToAnalyze) {
        if (!client.alerted_at && !client.is_confirmed && client.whatsapp_number !== 'Sur place') {
          await autoNotify(client);
        }
      }
    }
  };

  const fetchQueueOnly = async (bId: string) => {
    const { data, error } = await supabase
      .from('queue')
      .select(`
        *, 
        staff (name),
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
      
      queueRef.current = activeClients as Customer[];
      if (activeClients.length > 0) {
        triggerSlidingWindow(activeClients as Customer[], staffRef.current);
      }
    }
  };

  const fetchSettingsData = async (bId: string) => {
    const { data: sData } = await supabase.from('services').select('*').eq('barber_id', bId).order('created_at', { ascending: true });
    if (sData) setServices(sData);

    const { data: stData } = await supabase.from('staff').select('*').eq('barber_id', bId).order('created_at', { ascending: true });
    if (stData) {
      setStaff(stData);
      staffRef.current = stData;
      // Default the walk-in modal to the first available staff member
      const active = stData.filter(s => s.is_available);
      if (active.length > 0 && !selectedStaffId) {
        setSelectedStaffId(active[0].id);
      }
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

      await fetchSettingsData(barber.id); 
      await fetchQueueOnly(barber.id);
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

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !barberId) return;
      setUploadingServiceImage(true);
      const toastId = toast.loading("Compression et téléchargement...", { style: { borderRadius: '12px' } });
      
      const file = e.target.files[0];
      const webpBlob = await convertToWebP(file, 0.8);
      const fileName = `${barberId}-service-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('service_images')
        .upload(fileName, webpBlob, { contentType: 'image/webp' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('service_images').getPublicUrl(fileName);
      setNewServiceImageUrl(publicUrl);

      toast.success("Image optimisée et ajoutée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch (error) {
      console.error(error);
      toast.error("Erreur de téléchargement.");
    } finally {
      setUploadingServiceImage(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServiceDuration || !newServicePrice || !barberId) return;
    
    setIsAddingService(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const { data, error } = await supabase.from('services').insert([{
      barber_id: barberId,
      service_name: newServiceName,
      duration_minutes: parseInt(newServiceDuration),
      price_dh: parseInt(newServicePrice),
      image_url: newServiceImageUrl
    }]).select();

    if (!error && data) {
      setServices(prev => [...prev, data[0]]);
      setNewServiceName('');
      setNewServiceDuration('');
      setNewServicePrice('');
      setNewServiceImageUrl('');
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
      staffRef.current = [...staffRef.current, data[0]];
      
      // Auto-select if it's the first staff
      if (!selectedStaffId) setSelectedStaffId(data[0].id);

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
      const updated = staff.map(s => s.id === id ? { ...s, is_available: !currentStatus } : s);
      setStaff(updated);
      staffRef.current = updated;
      
      // Update walk-in selection safely
      const active = updated.filter(s => s.is_available);
      if (active.length > 0 && selectedStaffId === id && currentStatus) {
        setSelectedStaffId(active[0].id); // Reassign if we just disabled the currently selected
      } else if (active.length > 0 && !selectedStaffId) {
        setSelectedStaffId(active[0].id);
      }

      if (barberId) fetchQueueOnly(barberId); 
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const confirm = window.confirm("Supprimer ce membre de l'équipe ?");
    if (!confirm) return;

    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (!error) {
      const updated = staff.filter(s => s.id !== id);
      setStaff(updated);
      staffRef.current = updated;
      
      const active = updated.filter(s => s.is_available);
      if (active.length > 0) setSelectedStaffId(active[0].id);
      else setSelectedStaffId('');

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
      const toastId = toast.loading("Compression et téléchargement...", { style: { borderRadius: '12px' } });
      
      const file = e.target.files[0];
      const webpBlob = await convertToWebP(file, 0.8);
      const fileName = `${barberId}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('barber_profiles')
        .upload(fileName, webpBlob, { contentType: 'image/webp' });
        
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('barber_profiles').getPublicUrl(fileName);

      setProfileImage(publicUrl);
      await supabase.from('barbers').update({ profile_image_url: publicUrl }).eq('id', barberId);

      toast.success("Photo de profil optimisée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch (error) {
      console.error(error);
      toast.error("Erreur de téléchargement.");
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
    const toastId = toast.loading("Alerte manuelle en cours...", { style: { borderRadius: '12px' }}); 
    try {
      const sendName = customer.customers?.full_name || customer.customer_name;
      const { error } = await supabase.from('queue').update({ alerted_at: new Date().toISOString() }).eq('id', customer.id);
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

      toast.success(`Alerte envoyée à ${sendName.split(' ')[0]} !`, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
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
      staff_id: selectedStaffId || null, // ✨ Assign to specific chair
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

  const activeStaff = staff.filter(s => s.is_available);
  const unassignedQueue = queue.filter(q => !q.staff_id);

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
      
      {/* HEADER SECTION */}
      <div className="min-h-[25vh] pt-12 pb-8 w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
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

        <div className="relative z-10 mt-8 flex items-center gap-4">
          {profileImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={profileImage} alt="Profile" className="w-14 h-14 shrink-0 rounded-full object-cover border-2 border-white/20 shadow-lg" />
          ) : (
            <div className="w-14 h-14 shrink-0 bg-slate-800 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg">
              <span className="text-xl font-black text-amber-500">{shopName ? shopName.charAt(0).toUpperCase() : 'S'}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1 truncate">
              Bonjour, {ownerName ? ownerName.split(' ')[0] : ''}
            </h1>
            <p className="text-slate-400 font-medium text-xs truncate">{shopName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 sm:px-6 pt-6 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">

        {/* TAB 1: PER-CHAIR QUEUE */}
        {activeTab === 'queue' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">File d'attente</h2>
                <p className="text-sm font-bold text-amber-600 mt-0.5">{queue.length} personne(s) au total</p>
              </div>
            </div>

            <button 
              onClick={() => setShowWalkInModal(true)}
              className="w-full h-12 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 mb-8 shadow-md transition-transform active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 text-amber-400" /> Ajouter Sur Place
            </button>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse h-32 w-full"></div>
                ))}
              </div>
            ) : (
              <>
                {/* ✨ PER-CHAIR RENDER LOOP */}
                {activeStaff.length === 0 ? (
                  <div className="bg-red-50 text-red-500 p-6 rounded-3xl font-bold text-center mb-6 border border-red-100">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-red-400" />
                    Aucun coiffeur n'est actuellement disponible.<br/>Activez un membre de l'équipe dans les paramètres.
                  </div>
                ) : (
                  activeStaff.map(member => {
                    const memberQueue = queue.filter(q => q.staff_id === member.id);
                    
                    return (
                      <div key={member.id} className="mb-8 bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
                        
                        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-900 leading-tight">Fauteuil: {member.name}</h3>
                              <p className="text-xs font-bold text-slate-400">{memberQueue.length} en attente</p>
                            </div>
                          </div>
                        </div>

                        {memberQueue.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-sm font-medium">
                            Fauteuil libre
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {memberQueue.map((customer, index) => {
                              const isAlerted = !!customer.alerted_at;
                              const isConfirmed = customer.is_confirmed;
                              const displayName = customer.customers?.full_name || customer.customer_name;
                              const displayPhone = customer.customers?.phone_number || customer.whatsapp_number;
                              const timeRemaining = timers[customer.id] || 0;

                              // CARD #1: IN CHAIR
                              if (index === 0) {
                                return (
                                  <div key={customer.id} className="p-5 rounded-[1.5rem] bg-slate-900 text-white shadow-lg border border-slate-800 relative overflow-hidden transition-all">
                                    <div className="absolute -right-8 -bottom-8 opacity-[0.05] pointer-events-none">
                                      <Scissors className="w-40 h-40" />
                                    </div>
                                    <div className="flex justify-between items-start relative z-10">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                          <Scissors className="w-5 h-5 text-slate-900 animate-pulse" />
                                        </div>
                                        <div>
                                          <span className="text-amber-400 font-bold text-[10px] uppercase tracking-widest block">Sur le fauteuil</span>
                                          <h3 className="text-lg font-black text-white capitalize leading-tight">{displayName}</h3>
                                          <div className="flex items-center gap-1 mt-0.5">
                                            {displayPhone === 'Sur place' ? (
                                              <span className="bg-white/10 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Sur Place</span>
                                            ) : (
                                              <span className="text-slate-400 font-mono text-xs">{displayPhone}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {customer.queue_services && customer.queue_services.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-3 relative z-10">
                                        {customer.queue_services.map((qs, i) => qs.services && (
                                          <span key={i} className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                            {qs.services.service_name}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex gap-2 w-full mt-4 relative z-10">
                                      <button onClick={() => handleComplete(customer.id)} className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                                        <Check className="w-4 h-4" /> Terminer 
                                      </button>
                                      <button onClick={() => handleFreeze(customer.id)} className="w-12 h-12 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center shrink-0 border border-white/10">
                                        <UserX className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              // CARD #2+: WAITING
                              return (
                                <div 
                                  key={customer.id} 
                                  className={`p-4 rounded-[1.5rem] shadow-sm flex flex-col gap-3 transition-all ${
                                    isConfirmed 
                                      ? 'bg-emerald-50/40 border border-emerald-400 shadow-emerald-500/10' 
                                      : isAlerted 
                                        ? 'bg-orange-50/40 border border-orange-300 shadow-orange-500/10' 
                                        : 'bg-slate-50 border border-slate-100'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                        isConfirmed ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : isAlerted ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-slate-200 border-slate-300 text-slate-600'
                                      }`}>
                                        <span className="font-black text-sm">#{index + 1}</span>
                                      </div>
                                      <div>
                                        <h3 className="text-base font-black text-slate-900 capitalize leading-tight">{displayName}</h3>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                          {displayPhone === 'Sur place' ? (
                                            <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">Sur Place</span>
                                          ) : (
                                            <span className="text-slate-500 font-mono text-[11px]">{displayPhone}</span>
                                          )}
                                          
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

                                        {(customer.queue_services?.length ?? 0) > 0 && (
                                          <div className="flex flex-wrap items-center gap-1 mt-2">
                                            {customer.queue_services?.map((qs, i) => qs.services && (
                                              <span key={i} className="bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                {qs.services.service_name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {displayPhone !== 'Sur place' && !isConfirmed && (
                                      <div className="col-span-2">
                                        {isAlerted ? (
                                          <button disabled className={`w-full h-10 font-black rounded-xl text-xs flex items-center justify-center gap-2 ${timeRemaining > 0 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'}`}>
                                            <Timer className="w-4 h-4" /> {timeRemaining > 0 ? formatTime(timeRemaining) : "Relégation auto..."}
                                          </button>
                                        ) : (
                                          <button 
                                            onClick={() => handleNotify(customer)} 
                                            disabled={isSendingAuth === customer.id} 
                                            className="w-full h-10 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 text-xs"
                                          >
                                            {isSendingAuth === customer.id ? (
                                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                              <><Bell className="w-3.5 h-3.5 text-amber-400" /> Alerter (App)</>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                    
                                    <button onClick={() => handleComplete(customer.id)} className="h-10 flex items-center justify-center gap-1.5 font-bold rounded-xl active:scale-[0.98] text-xs bg-emerald-50 text-emerald-600 border border-emerald-100">
                                      <Check className="w-3.5 h-3.5" /> Terminé
                                    </button>
                                    <button onClick={() => handleFreeze(customer.id)} className="h-10 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 font-bold rounded-xl active:scale-[0.98] text-xs border border-blue-100">
                                      <Snowflake className="w-3.5 h-3.5" /> Pause
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* LEGACY OR UNASSIGNED CLIENTS */}
                {unassignedQueue.length > 0 && (
                  <div className="mb-8 bg-slate-100 border border-slate-200 rounded-[2rem] p-4 shadow-inner">
                    <div className="flex items-center gap-3 mb-4 pb-3">
                      <div className="w-10 h-10 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">File Globale</h3>
                        <p className="text-xs font-bold text-slate-500">Clients sans fauteuil assigné</p>
                      </div>
                    </div>
                    {/* Render basic unassigned list */}
                    <div className="space-y-3">
                      {unassignedQueue.map(customer => (
                         <div key={customer.id} className="bg-white p-3 rounded-2xl flex justify-between items-center shadow-sm">
                            <span className="font-bold">{customer.customers?.full_name || customer.customer_name}</span>
                            <button onClick={() => handleComplete(customer.id)} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg">Terminer</button>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {frozenQueue.length > 0 && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <Snowflake className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Clients en pause</h2>
                </div>
                <div className="space-y-2">
                  {frozenQueue.map(customer => (
                    <div key={customer.id} className="bg-white p-3 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 capitalize">{customer.customers?.full_name || customer.customer_name}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUnfreeze(customer.id)} className="h-8 px-3 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs transition-colors active:scale-95">
                          Réactiver
                        </button>
                        <button onClick={() => handleHardCancel(customer.id)} className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg active:scale-95">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2 - MODULAR SETTINGS UI */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-2 px-2">
              <Settings className="w-6 h-6 text-slate-400" /> Paramètres
            </h2>

            {/* CARD 1: IDENTITÉ DU SALON */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-blue-500" />
                <h4 className="text-lg font-black text-slate-900">Identité du Salon</h4>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 relative overflow-hidden flex items-center gap-4">
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

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lien Google Maps</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <input type="url" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="http://googleusercontent.com..." className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 outline-none" />
                  </div>
                </div>

                <button type="submit" disabled={isSavingProfile} className="w-full h-12 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  <Save className="w-4 h-4 text-amber-400" /> Enregistrer les infos
                </button>
              </form>
            </div>

            {/* CARD 2: CARTE DES PRESTATIONS */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="w-5 h-5 text-amber-500" />
                <h4 className="text-lg font-black text-slate-900">Carte des Prestations</h4>
              </div>
              
              <form onSubmit={handleAddService} className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="col-span-2 flex gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm">
                    <input type="file" accept="image/*" onChange={handleServiceImageUpload} disabled={uploadingServiceImage} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {newServiceImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={newServiceImageUrl} className="w-full h-full object-cover" alt="Prestation" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nom du service</label>
                    <input type="text" required value={newServiceName} onChange={(e)=>setNewServiceName(e.target.value)} placeholder="Coupe Standard" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Durée (min)</label>
                  <input type="number" required min="1" value={newServiceDuration} onChange={(e)=>setNewServiceDuration(e.target.value)} placeholder="30" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prix (DH)</label>
                  <input type="number" required min="0" value={newServicePrice} onChange={(e)=>setNewServicePrice(e.target.value)} placeholder="50" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 outline-none" />
                </div>
                <button type="submit" disabled={isAddingService || uploadingServiceImage} className="col-span-2 h-10 bg-slate-900 text-white font-bold rounded-lg mt-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  <Plus className="w-4 h-4 text-amber-400" /> Ajouter la prestation
                </button>
              </form>

              <div className="space-y-2">
                {services.map(service => (
                  <div key={service.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      {service.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={service.image_url} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200" alt="" />
                      ) : (
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                          <Scissors className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{service.service_name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{service.duration_minutes} min • {service.price_dh} DH</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteService(service.id)} className="w-8 h-8 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 3: L'ÉQUIPE */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-emerald-500" />
                <h4 className="text-lg font-black text-slate-900">L'Équipe</h4>
              </div>
              
              <form onSubmit={handleAddStaff} className="flex gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="flex-1">
                  <input type="text" required value={newStaffName} onChange={(e)=>setNewStaffName(e.target.value)} placeholder="Prénom du coiffeur" className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-900 outline-none" />
                </div>
                <button type="submit" disabled={isAddingStaff} className="h-10 px-4 bg-slate-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shrink-0">
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>
              </form>

              <div className="space-y-2">
                {staff.map(member => (
                  <div key={member.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${member.is_available ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {member.is_available ? 'Disponible' : 'Absent (Fauteuil désactivé)'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleStaffAvailability(member.id, member.is_available)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${member.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {member.is_available ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteStaff(member.id)} className="w-8 h-8 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARD 4: MARKETING & DATA */}
            {!isLoading && shareLink && (
              <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden group mb-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="flex items-center gap-5 relative z-10 mb-6">
                  <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded-xl" crossOrigin="anonymous" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg leading-tight">Marketing & Data</h3>
                    <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mt-1">Affiche QR & Stats</p>
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

                  <Link href="/analytics" className="w-full h-12 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm mt-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" /> Voir les statistiques du jour
                  </Link>
                </div>
              </div>
            )}
            
          </div>
        )}

        {/* ✨ UPDATED WALK IN MODAL (CHAIR ASSIGNMENT) */}
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
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1 transition-all mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prénom du client</label>
                  <input type="text" autoFocus required value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-900 placeholder-slate-300 focus:ring-0 outline-none" placeholder="Ex: Karim" />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-slate-900 focus-within:ring-1 transition-all mb-6">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Coiffeur (Fauteuil)</label>
                  <select 
                    value={selectedStaffId} 
                    onChange={(e) => setSelectedStaffId(e.target.value)} 
                    className="w-full bg-transparent border-none p-0 text-base font-bold text-slate-900 focus:ring-0 outline-none"
                    required
                  >
                    {staff.filter(s => s.is_available).length === 0 && <option value="" disabled>Aucun coiffeur dispo</option>}
                    {staff.filter(s => s.is_available).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={isAddingWalkIn || !walkInName.trim() || !selectedStaffId} className="w-full h-14 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] disabled:opacity-50 text-lg flex items-center justify-center gap-2">
                  {isAddingWalkIn ? 'Ajout...' : 'Ajouter à la file'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-6 pb-2">
        <button 
          onClick={() => setActiveTab('queue')} 
          className={`flex flex-col items-center justify-center w-24 transition-colors ${activeTab === 'queue' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutList className="w-6 h-6" />
          <span className="text-[10px] font-black mt-1 uppercase tracking-wider">File</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`flex flex-col items-center justify-center w-24 transition-colors ${activeTab === 'settings' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-black mt-1 uppercase tracking-wider">Paramètres</span>
        </button>
      </div>

    </div>
  );
}