'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  Bell, MessageCircle, Tv, Coffee, LogOut, Copy, Check, UserX, CheckCircle2, 
  UserPlus, X, Download, Power, MapPin, UploadCloud, Settings, Save, Store, 
  User, ArrowRight, Timer, Scissors, Snowflake, BarChart3, Plus, Trash2, 
  ToggleLeft, ToggleRight, LayoutList, Image as ImageIcon, KeyRound, Circle, 
  Loader2, Volume2, VolumeX, Clock, Users, Search, FileText 
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
  total_estimated_time?: number | null;
  staff_id?: string; 
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

const WEEK_DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: "Vendredi (Jumu'ah)" },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
] as const;

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
  const [activeTab, setActiveTab] = useState<'queue' | 'clients' | 'settings'>('queue');

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
  const [selectedStaffId, setSelectedStaffId] = useState<string>(''); 
  const [selectedWalkInServices, setSelectedWalkInServices] = useState<string[]>([]);
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
  const [newStaffPin, setNewStaffPin] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  const [location, setLocation] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [workingHours, setWorkingHours] = useState<Record<string, any>>(DEFAULT_WORKING_HOURS);
  const [isSavingHours, setIsSavingHours] = useState(false);

  const [allHistoryTickets, setAllHistoryTickets] = useState<any[]>([]);
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});
  const [clientSearch, setClientSearch] = useState('');
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const [timers, setTimers] = useState<Record<string, number>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('noubba_sound_enabled');
    if (saved === 'true') {
      setSoundEnabled(true);
      soundEnabledRef.current = true;
    }
  }, []);

  const toggleSound = () => {
    if (!soundEnabled) {
      const audio = new Audio('/ding.mp3');
      audio.play().then(() => {
        setSoundEnabled(true);
        soundEnabledRef.current = true;
        localStorage.setItem('noubba_sound_enabled', 'true');
        toast.success("Son activé ! Test sonore 🔔", { style: { borderRadius: '12px' } });
      }).catch(e => {
        console.log("Audio unlock failed:", e);
        toast.error("Autorisez le son dans votre navigateur");
      });
    } else {
      setSoundEnabled(false);
      soundEnabledRef.current = false;
      localStorage.setItem('noubba_sound_enabled', 'false');
      toast("Son coupé 🔕", { style: { borderRadius: '12px' } });
    }
  };

  const testSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = new Audio('/ding.mp3');
    audio.play().then(() => {
      toast.success("Test sonore 🔔", { style: { borderRadius: '12px' } });
    }).catch(e => console.log("Audio test error", e));
  };
  
  const queueRef = useRef<Customer[]>([]);
  const staffRef = useRef<any[]>([]);
  const confirmedIds = useRef<Set<string>>(new Set());
  const router = useRouter();

  const handleAutoPenalty = async (customer: Customer) => {
    const strikes = customer.delay_count || 0;

    if (strikes >= 2) {
      await supabase.from('queue').update({ status: 'cancelled' }).eq('id', customer.id);
      toast.error(`${customer.customer_name} a ignoré 3 alertes. Retiré de la file !`);
    } else if (strikes === 1) {
      const currentQueue = queueRef.current.filter(c => customer.staff_id ? c.staff_id === customer.staff_id : true);
      const otherClients = currentQueue.filter(c => c.id !== customer.id);
      
      let newJoinedAt = new Date().toISOString();
      if (otherClients.length > 0) {
        const lastClient = otherClients[otherClients.length - 1];
        const lastTime = new Date(lastClient.joined_at || new Date()).getTime();
        newJoinedAt = new Date(Math.max(Date.now(), lastTime + 1000)).toISOString();
      }

      await supabase.from('queue').update({
        joined_at: newJoinedAt,
        alerted_at: null,
        is_confirmed: false,
        delay_count: 2
      }).eq('id', customer.id);
      toast.error(`${customer.customer_name} relégué à la fin de la file !`);
    } else {
      const currentQueue = queueRef.current.filter(c => customer.staff_id ? c.staff_id === customer.staff_id : true);
      const currentIndex = currentQueue.findIndex(c => c.id === customer.id);
      
      let newJoinedAt = new Date().toISOString();
      if (currentIndex !== -1 && currentIndex < currentQueue.length - 1) {
        const nextPerson = currentQueue[currentIndex + 1];
        const nextTime = new Date(nextPerson.joined_at || new Date()).getTime();
        newJoinedAt = new Date(nextTime + 1000).toISOString();
      } else {
        newJoinedAt = new Date().toISOString();
      }

      await supabase.from('queue').update({
        joined_at: newJoinedAt,
        alerted_at: null,
        is_confirmed: false,
        delay_count: 1
      }).eq('id', customer.id);
      toast.error(`${customer.customer_name} est en retard. Place reculée.`);
    }
    
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

  const triggerSlidingWindow = async (currentQueue: Customer[], currentStaff: any[]) => {
    const activeStaff = currentStaff.filter(s => s.is_available);
    for (const member of activeStaff) {
      const memberQueue = currentQueue.filter(c => c.staff_id === member.id);
      const clientsToAnalyze = memberQueue.slice(0, 2); 
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
          let remaining = 600 - elapsed;
          remaining = Math.max(0, Math.min(600, remaining)); 
          setTimers(prev => ({ ...prev, [customer.id]: remaining }));
        }
      });

      if (shouldPlaySound && soundEnabledRef.current) {
        const audio = new Audio('/ding.mp3');
        audio.play().catch(e => console.log("Audio blocked", e));
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
      const active = stData.filter(s => s.is_available);
      if (active.length > 0 && !selectedStaffId) {
        setSelectedStaffId(active[0].id);
      }
    }

    const { data: histData } = await supabase
      .from('queue')
      .select('id, customer_name, whatsapp_number, status, joined_at, customers(full_name, phone_number)')
      .eq('barber_id', bId)
      .order('joined_at', { ascending: false })
      .limit(500);
    if (histData) setAllHistoryTickets(histData);
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

      if (barber.client_notes) {
        setClientNotes(barber.client_notes);
      } else {
        const localNotes = localStorage.getItem(`noubba_notes_${barber.id}`);
        if (localNotes) {
          try { setClientNotes(JSON.parse(localNotes)); } catch {}
        }
      }

      if (barber.working_hours) {
        setWorkingHours({ ...DEFAULT_WORKING_HOURS, ...barber.working_hours });
      } else {
        const localHours = localStorage.getItem(`noubba_hours_${barber.id}`);
        if (localHours) {
          try { setWorkingHours({ ...DEFAULT_WORKING_HOURS, ...JSON.parse(localHours) }); } catch {}
        }
      }

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
      const toastId = toast.loading("Compression...", { style: { borderRadius: '12px' } });
      
      const file = e.target.files[0];
      const webpBlob = await convertToWebP(file, 0.8);
      const fileName = `${barberId}-service-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage.from('service_images').upload(fileName, webpBlob, { contentType: 'image/webp' });
      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('service_images').getPublicUrl(fileName);
      setNewServiceImageUrl(publicUrl);

      toast.success("Image ajoutée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch (error: any) {
      toast.error(`Échec: ${error.message}`, { duration: 5000 });
    } finally {
      setUploadingServiceImage(false);
      if (e.target) e.target.value = ''; 
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
      toast.success("Prestation supprimée !");
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPin || !barberId) return;

    if (newStaffPin.length !== 4 || !/^\d+$/.test(newStaffPin)) {
      toast.error("Le code PIN doit contenir exactement 4 chiffres.");
      return;
    }
    
    setIsAddingStaff(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const { data, error } = await supabase.from('staff').insert([{
      barber_id: barberId,
      name: newStaffName,
      access_pin: newStaffPin,
      is_available: true
    }]).select();

    if (!error && data) {
      setStaff(prev => [...prev, data[0]]);
      staffRef.current = [...staffRef.current, data[0]];
      if (!selectedStaffId) setSelectedStaffId(data[0].id);
      setNewStaffName('');
      setNewStaffPin('');
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
      
      const active = updated.filter(s => s.is_available);
      if (active.length > 0 && selectedStaffId === id && currentStatus) {
        setSelectedStaffId(active[0].id); 
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
      toast.success("Membre supprimé !");
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
      const toastId = toast.loading("Compression...", { style: { borderRadius: '12px' } });
      
      const file = e.target.files[0];
      const webpBlob = await convertToWebP(file, 0.8);
      const fileName = `${barberId}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage.from('barber_profiles').upload(fileName, webpBlob, { contentType: 'image/webp' });
      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('barber_profiles').getPublicUrl(fileName);

      setProfileImage(publicUrl);
      await supabase.from('barbers').update({ profile_image_url: publicUrl }).eq('id', barberId);

      toast.success("Photo optimisée !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch (error: any) {
      toast.error(`Échec: ${error.message}`, { duration: 5000 });
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId) return;
    setIsSavingProfile(true);
    const toastId = toast.loading("Mise à jour...", { style: { borderRadius: '12px' }});

    const { error } = await supabase.from('barbers').update({ location: location }).eq('id', barberId);
    if (!error) toast.success("Mise à jour réussie !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    else toast.error("Erreur.", { id: toastId });
    setIsSavingProfile(false);
  };

  const getClientKey = (name: string, phone: string) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length >= 8 && phone !== 'Sur place') return `phone:${cleanPhone.slice(-9)}`;
    return `name:${(name || 'client').trim().toLowerCase()}`;
  };

  const handleSaveClientNote = async (clientKey: string) => {
    if (!barberId) return;
    const updated = { ...clientNotes, [clientKey]: noteDraft.trim() };
    setClientNotes(updated);
    setEditingNoteKey(null);
    localStorage.setItem(`noubba_notes_${barberId}`, JSON.stringify(updated));
    await supabase.from('barbers').update({ client_notes: updated }).eq('id', barberId);
    toast.success("Note client enregistrée !", { icon: '📝', style: { borderRadius: '12px' } });
  };

  const updateDaySchedule = (dayKey: string, field: 'open' | 'close' | 'closed', value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayKey]: { ...(prev[dayKey] || DEFAULT_WORKING_HOURS[dayKey]), [field]: value }
    }));
  };

  const handleSaveWorkingHours = async () => {
    if (!barberId) return;
    setIsSavingHours(true);
    const toastId = toast.loading("Enregistrement des horaires...", { style: { borderRadius: '12px' } });
    localStorage.setItem(`noubba_hours_${barberId}`, JSON.stringify(workingHours));

    const { error } = await supabase.from('barbers').update({ working_hours: workingHours }).eq('id', barberId);
    if (!error) {
      toast.success("Horaires enregistrés !", { id: toastId, icon: '🕒' });
    } else {
      toast.success("Horaires sauvegardés !", { id: toastId, icon: '🕒' });
    }
    setIsSavingHours(false);
  };

  const toggleShopStatus = async () => {
    if (!barberId) return;
    setIsToggling(true);
    const newStatus = !isOpen;
    const { error } = await supabase.from('barbers').update({ is_open: newStatus }).eq('id', barberId);

    if (!error) {
      setIsOpen(newStatus);
      if (newStatus) toast.success("Salon ouvert !", { icon: '🟢' });
      else toast("Salon fermé !", { icon: '🔴' });
    }
    setIsToggling(false);
  };

  const handleComplete = async (customerId: string) => {
    const { error } = await supabase.from('queue').update({ status: 'completed' }).eq('id', customerId);
    if (!error) {
      if (barberId) fetchQueueOnly(barberId);
      toast.success("Coupe terminée !", { icon: '✨' });
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
      toast.success("Client mis en pause.", { id: toastId, icon: '❄️' });
    }
  };

  const handleUnfreeze = async (customerId: string) => {
    const toastId = toast.loading("Réactivation...", { style: { borderRadius: '12px' }});
    const { error } = await supabase.from('queue').update({ 
      status: 'waiting',
      joined_at: new Date().toISOString(), 
      frozen_at: null
    }).eq('id', customerId);

    if (!error) {
      if (barberId) fetchQueueOnly(barberId);
      toast.success("Client réactivé !", { id: toastId, icon: '🔥' });
    }
  };

  const handleHardCancel = async (customerId: string) => {
    const confirm = window.confirm("Retirer définitivement ce client de la file ?");
    if (!confirm) return;

    const { error } = await supabase.from('queue').update({ status: 'cancelled' }).eq('id', customerId);
    if (!error) {
      if (barberId) fetchQueueOnly(barberId);
      toast("Client retiré.", { icon: '👋' });
    }
  };

  const handleNotify = async (customer: Customer) => {
    setIsSendingAuth(customer.id);
    const toastId = toast.loading("Alerte...", { style: { borderRadius: '12px' }}); 
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
            body: `Le salon ${shopName} vous attend.`
          })
        }).catch(err => console.error(err));
      }

      toast.success(`Alerte envoyée à ${sendName.split(' ')[0]} !`, { id: toastId });
      if (barberId) fetchQueueOnly(barberId); 
    } catch (error) {
      toast.error("Erreur réseau.", { id: toastId });
    } finally {
      setIsSendingAuth(null);
    }
  };

  const toggleWalkInService = (serviceId: string) => {
    setSelectedWalkInServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
  };

  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !barberId || !selectedStaffId) return;
    
    setIsAddingWalkIn(true);
    const toastId = toast.loading("Ajout en cours...", { style: { borderRadius: '12px' }});

    const totalTime = selectedWalkInServices.reduce((total, id) => {
      const s = services.find(srv => srv.id === id);
      return total + (s?.duration_minutes || 0);
    }, 0);

    const newJoinedAt = new Date().toISOString();

    const { data: newTicket, error } = await supabase.from('queue').insert([{
      barber_id: barberId,
      staff_id: selectedStaffId,
      customer_name: walkInName,
      whatsapp_number: 'Sur place',
      status: 'waiting',
      total_estimated_time: totalTime > 0 ? totalTime : null,
      joined_at: newJoinedAt
    }]).select().single();

    if (error) {
      toast.error("Erreur d'ajout.", { id: toastId });
    } else if (newTicket) {
      if (selectedWalkInServices.length > 0) {
        const serviceInserts = selectedWalkInServices.map(sId => ({ queue_id: newTicket.id, service_id: sId }));
        await supabase.from('queue_services').insert(serviceInserts);
      }
      toast.success("Client ajouté !", { id: toastId });
      setShowWalkInModal(false);
      setWalkInName('');
      setSelectedWalkInServices([]);
      fetchQueueOnly(barberId);
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

  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const shopSlug = shopName ? toSlug(shopName) : ownerName ? toSlug(ownerName) : barberId;
  const shareLink = origin && shopSlug ? `${origin}/${shopSlug}` : '';
  const qrCodeUrl = shareLink ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shareLink)}&color=0f172a&bgcolor=ffffff` : '';
  const staffPortalLink = origin && barberId ? `${origin}/staff/${barberId}` : '';

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
        toast.success("Affiche téléchargée !", { id: toastId });
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

  const clientDirectory = (() => {
    const map = new Map<string, { key: string; name: string; phone: string; completed: number; noShows: number; lastVisit: string }>();
    const combined = [...queue, ...allHistoryTickets];
    combined.forEach((t: any) => {
      const name = t.customers?.full_name || t.customer_name || 'Client';
      const phone = t.customers?.phone_number || t.whatsapp_number || 'Sur place';
      const key = getClientKey(name, phone);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          name,
          phone,
          completed: t.status === 'completed' ? 1 : 0,
          noShows: t.status === 'cancelled' ? 1 : 0,
          lastVisit: t.joined_at || new Date().toISOString()
        });
      } else {
        if (t.status === 'completed') existing.completed += 1;
        if (t.status === 'cancelled') existing.noShows += 1;
        if (t.joined_at && new Date(t.joined_at) > new Date(existing.lastVisit)) {
          existing.lastVisit = t.joined_at;
        }
      }
    });
    return Array.from(map.values()).filter(c => {
      if (!clientSearch.trim()) return true;
      const q = clientSearch.toLowerCase();
      const note = (clientNotes[c.key] || '').toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || note.includes(q);
    });
  })();

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
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
          
          <div className="flex items-center gap-2">
            {!soundEnabled ? (
              <button
                onClick={toggleSound}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-xs transition-all border backdrop-blur-md bg-white/10 text-slate-300 border-white/20 active:scale-95 hover:bg-white/20 shadow-sm"
                title="Cliquer pour activer le son des alertes"
              >
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Activer le son</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-2.5 py-1.5 backdrop-blur-md shadow-sm">
                <button
                  onClick={testSound}
                  className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs hover:text-white transition-colors"
                  title="Tester le son du salon"
                >
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Son Activé</span>
                </button>
                <button
                  onClick={toggleSound}
                  className="text-slate-400 hover:text-red-400 text-xs ml-1 pl-1 border-l border-emerald-500/30"
                  title="Couper le son"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button onClick={handleLogout} className="w-10 h-10 shrink-0 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md" title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
                {activeStaff.length === 0 ? (
                  <div className="bg-red-50 text-red-500 p-6 rounded-3xl font-bold text-center mb-6 border border-red-100">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-red-400" />
                    Aucun coiffeur n'est actuellement disponible.<br/>Activez un membre de l'équipe dans les paramètres.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeStaff.map(member => {
                      const memberQueue = queue.filter(q => q.staff_id === member.id);
                      return (
                        <div key={member.id} className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm h-fit">
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
                            <div className="py-6 text-center text-slate-400 text-sm font-medium">Fauteuil libre</div>
                          ) : (
                            <div className="space-y-3">
                              {memberQueue.map((customer, index) => {
                                const isAlerted = !!customer.alerted_at;
                                const isConfirmed = customer.is_confirmed;
                                const displayName = customer.customers?.full_name || customer.customer_name;
                                const displayPhone = customer.customers?.phone_number || customer.whatsapp_number;
                                const timeRemaining = timers[customer.id] || 0;

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

                                      {clientNotes[getClientKey(displayName, displayPhone)] && (
                                        <div className="mt-2.5 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-1.5 text-xs text-amber-200 font-bold flex items-center gap-1.5 relative z-10">
                                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                          <span className="truncate">{clientNotes[getClientKey(displayName, displayPhone)]}</span>
                                        </div>
                                      )}

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
                                            <div className="flex gap-2">
                                              <button 
                                                onClick={() => handleNotify(customer)} 
                                                disabled={isSendingAuth === customer.id} 
                                                className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 text-xs"
                                              >
                                                {isSendingAuth === customer.id ? (
                                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                  <><Bell className="w-3.5 h-3.5 text-amber-400" /> Alerter (App)</>
                                                )}
                                              </button>
                                              {displayPhone && (
                                                <a
                                                  href={`https://wa.me/${displayPhone.replace(/\D/g, '').replace(/^0/, '212')}?text=${encodeURIComponent(`Salam ${customer.customers?.full_name || customer.customer_name}, c'est bientôt votre tour chez ${shopName} ! Merci de vous rapprocher.`)}`}
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
                                      
                                      <button onClick={() => handleHardCancel(customer.id)} className="h-10 flex items-center justify-center gap-1.5 font-bold rounded-xl active:scale-[0.98] text-xs bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors">
                                        <X className="w-3.5 h-3.5" /> Retirer
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
                    })}
                  </div>
                )}

                {unassignedQueue.length > 0 && (
                  <div className="mt-8 mb-8 bg-slate-100 border border-slate-200 rounded-[2rem] p-4 shadow-inner">
                    <div className="flex items-center gap-3 mb-4 pb-3">
                      <div className="w-10 h-10 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">File Globale</h3>
                        <p className="text-xs font-bold text-slate-500">Clients sans fauteuil assigné</p>
                      </div>
                    </div>
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
                        <button onClick={() => handleHardCancel(customer.id)} className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg active:scale-95 transition-colors">
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

        {activeTab === 'clients' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Carnet Clients</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{clientDirectory.length} client(s) enregistré(s) • Notes & Historique</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Rechercher par nom, téléphone ou note (ex: dégradé)..."
                className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none"
              />
              {clientSearch && (
                <button onClick={() => setClientSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {clientDirectory.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center text-slate-400 font-bold text-sm">
                Aucun client trouvé.
              </div>
            ) : (
              <div className="space-y-3">
                {clientDirectory.map((client) => {
                  const note = clientNotes[client.key] || '';
                  const isEditing = editingNoteKey === client.key;
                  const cleanPhone = client.phone.replace(/\D/g, '');
                  const canWhatsApp = cleanPhone.length >= 9 && client.phone !== 'Sur place';

                  return (
                    <div key={client.key} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-base capitalize leading-tight">{client.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono text-slate-500">{client.phone}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {client.completed} visite(s)
                              </span>
                              {client.noShows > 0 && (
                                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                  {client.noShows} No-Show
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {canWhatsApp && (
                            <a
                              href={`https://wa.me/${cleanPhone.replace(/^0/, '212')}?text=${encodeURIComponent(`Salam ${client.name}, c'est le salon${shopName} !`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-200 transition-colors"
                              title="Contacter sur WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingNoteKey(null);
                              } else {
                                setEditingNoteKey(client.key);
                                setNoteDraft(note);
                              }
                            }}
                            className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-500" />
                            {note ? 'Modifier note' : '+ Note'}
                          </button>
                        </div>
                      </div>

                      {note && !isEditing && (
                        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-amber-900 flex items-start gap-2">
                          <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </div>
                      )}

                      {isEditing && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Note privée du coiffeur (Préférences coupe, barbe, boisson...)
                          </label>
                          <input
                            type="text"
                            autoFocus
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Ex: Dégradé à blanc, ciseaux au dessus, thé sans sucre..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNoteKey(null)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveClientNote(client.key)}
                              className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Enregistrer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-2 px-2">
              <Settings className="w-6 h-6 text-slate-400" /> Paramètres
            </h2>

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

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">Horaires d'Ouverture</h4>
                    <p className="text-[11px] font-medium text-slate-400">Planning hebdomadaire affiché aux clients</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkingHours(prev => ({ ...prev, auto_mode: !prev.auto_mode }))}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    workingHours.auto_mode ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {workingHours.auto_mode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  Auto
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {WEEK_DAYS.map(({ key, label }) => {
                  const day = workingHours[key] || DEFAULT_WORKING_HOURS[key];
                  return (
                    <div key={key} className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => updateDaySchedule(key, 'closed', !day.closed)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${!day.closed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}
                        >
                          {!day.closed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`text-xs font-bold ${day.closed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{label}</span>
                      </div>

                      {day.closed ? (
                        <span className="text-[11px] font-black uppercase tracking-wider text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">Fermé (Repos)</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) => updateDaySchedule(key, 'open', e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 outline-none focus:border-slate-900"
                          />
                          <span className="text-slate-400 font-bold text-xs">à</span>
                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) => updateDaySchedule(key, 'close', e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 outline-none focus:border-slate-900"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSaveWorkingHours}
                disabled={isSavingHours}
                className="w-full h-11 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4 text-emerald-400" /> Enregistrer les horaires
              </button>
            </div>

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

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-emerald-500" />
                <h4 className="text-lg font-black text-slate-900">L'Équipe & Accès Staff</h4>
              </div>
              
              <form onSubmit={handleAddStaff} className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="flex-1">
                  <input type="text" required value={newStaffName} onChange={(e)=>setNewStaffName(e.target.value)} placeholder="Prénom du coiffeur" className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-900 outline-none" />
                </div>
                <div className="w-full sm:w-32">
                  <input type="text" maxLength={4} pattern="\d{4}" required value={newStaffPin} onChange={(e)=>setNewStaffPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN (4 chiffres)" className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-900 outline-none text-center tracking-widest" />
                </div>
                <button type="submit" disabled={isAddingStaff} className="h-10 px-4 bg-slate-900 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 w-full sm:w-auto">
                  <Plus className="w-4 h-4 text-emerald-400" /> Ajouter
                </button>
              </form>

              <div className="space-y-2">
                {staff.map(member => (
                  <div key={member.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`text-[10px] font-black uppercase tracking-wider ${member.is_available ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {member.is_available ? 'Disponible' : 'Désactivé'}
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3 h-3" /> PIN: <span className="font-black text-slate-700">{member.access_pin || '----'}</span>
                        </p>
                      </div>
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

              {staffPortalLink && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lien Portail Staff</h5>
                  <button onClick={() => copyToClipboard(staffPortalLink)} className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-200 text-xs">
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Lien Copié !' : "Copier le lien pour l'iPad / Employés"}
                  </button>
                </div>
              )}
            </div>

            {!isLoading && shareLink && (
              <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden group mb-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="flex items-center gap-5 relative z-10 mb-6">
                  <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded-xl" crossOrigin="anonymous" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-black text-lg leading-tight">Marketing & Data</h3>
                    <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mt-1">Lien Instagram, Maps & QR</p>
                    <div className="mt-2 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-emerald-400 truncate">{shareLink.replace(/^https?:\/\//, '')}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-3">
                  <button onClick={downloadQR} className="w-full h-12 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-xl transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Télécharger l'Affiche
                  </button>
                  <button onClick={() => copyToClipboard(shareLink)} className="w-full h-12 bg-white/10 active:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                    {copied ? 'Lien Copié !' : 'Copier le lien direct client'}
                  </button>
                  <a
                    href={`/screen/${barberId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
                  >
                    <Tv className="w-4 h-4 text-amber-400" /> Mode Écran Salon (TV)
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {showWalkInModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 sm:p-8 pb-12 sm:pb-12 shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
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

                {services.length > 0 && (
                  <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Prestations (Optionnel)</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {services.map(service => {
                        const isSelected = selectedWalkInServices.includes(service.id);
                        return (
                          <button type="button" key={service.id} onClick={() => toggleWalkInService(service.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${isSelected ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-transparent'}`}>
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

                <button type="submit" disabled={isAddingWalkIn || !walkInName.trim() || !selectedStaffId} className="w-full h-14 bg-amber-500 active:bg-amber-400 text-slate-900 font-black rounded-2xl transition-all shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] disabled:opacity-50 text-lg flex items-center justify-center gap-2">
                  {isAddingWalkIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ajouter à la file'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-2 pb-safe">
        <button 
          onClick={() => setActiveTab('queue')} 
          className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === 'queue' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutList className="w-5 h-5" />
          <span className="text-[9px] font-black mt-1 uppercase tracking-wider">File</span>
        </button>

        <button 
          onClick={() => { setActiveTab('clients'); if (barberId) fetchSettingsData(barberId); }} 
          className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === 'clients' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-black mt-1 uppercase tracking-wider">Clients</span>
        </button>
        
        <Link 
          href="/analytics" 
          className="flex flex-col items-center justify-center w-20 transition-colors text-slate-400 hover:text-slate-600"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[9px] font-black mt-1 uppercase tracking-wider">Stats</span>
        </Link>

        <button 
          onClick={() => setActiveTab('settings')} 
          className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === 'settings' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-black mt-1 uppercase tracking-wider">Réglages</span>
        </button>
      </div>
    </div>
  );
}