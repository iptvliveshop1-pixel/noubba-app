'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Bell, Coffee, LogOut, Copy, Check, UserX, CheckCircle2, QrCode, UserPlus, X, Download, Power, MapPin, UploadCloud, Settings, Save } from 'lucide-react';

type Customer = {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  notified?: boolean; 
};

export default function Dashboard() {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
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

  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);

    const checkAuthAndFetchQueue = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: barber } = await supabase.from('barbers').select('*').eq('user_id', session.user.id).single();

      if (!barber || barber.approval_status === 'pending') {
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

      const { data, error } = await supabase
        .from('queue')
        .select('*')
        .eq('barber_id', barber.id) 
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true }); 

      if (!error && data) setQueue(data);
      setIsLoading(false);
    };
    checkAuthAndFetchQueue();
  }, []);

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
    const toastId = toast.loading("Envoi WhatsApp en cours...", { style: { borderRadius: '12px' }}); 
    
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.whatsapp_number,
          name: customer.customer_name,
          salonName: shopName 
        })
      });

      if (response.ok) {
        toast.success(`Message envoyé à ${customer.customer_name} !`, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
        setQueue(prev => prev.map(c => c.id === customer.id ? { ...c, notified: true } : c));
      } else {
        toast.error("Échec de l'envoi.", { id: toastId });
      }
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

  const shopSlug = ownerName ? ownerName.toLowerCase().replace(/\s+/g, '-') : '';
  const shareLink = origin && shopSlug ? `${origin}/${shopSlug}` : '';
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

  if (!isLoading && !isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 max-w-md w-full animate-in fade-in duration-500">
          <h2 className="text-2xl font-extrabold text-amber-600 mb-4 flex items-center justify-center gap-3 tracking-tight">
            Compte en attente <Coffee className="w-6 h-6 animate-bounce" />
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">Votre compte est en cours d'activation par l'administrateur. Veuillez revenir plus tard.</p>
          <button onClick={handleLogout} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans text-slate-900 pb-32 selection:bg-amber-200 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 flex justify-between items-center bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 sticky top-4 z-40">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Dashboard {shopName ? <span className="text-amber-500 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 hidden sm:block"></span>{shopName}</span> : ''}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleShopStatus}
              disabled={isToggling}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-sm active:scale-95 ${
                isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Power className={`w-4 h-4 ${isOpen ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{isOpen ? 'Ouvert' : 'Fermé'}</span>
            </button>
            <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-5 py-3 rounded-xl transition-all hover:shadow-sm active:scale-95">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>

        {/* FILE D'ATTENTE (QUEUE) */}
        <div className="flex justify-between items-end mb-6 px-2">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">File d'attente</h2>
          <button onClick={() => setShowWalkInModal(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-md active:scale-95 text-sm sm:text-base">
            <UserPlus className="w-4 h-4 text-amber-400" /> <span className="hidden sm:inline">Ajouter </span>Sur place
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row justify-between items-start md:items-center gap-5 animate-pulse">
                <div className="w-full md:w-1/3">
                  <div className="h-3 bg-slate-200 rounded-full w-24 mb-4"></div>
                  <div className="h-7 bg-slate-200 rounded-lg w-48 mb-3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Coffee className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">La file est vide</h3>
            <p className="text-slate-500 font-medium">Partagez votre QR code pour attirer des clients !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((customer, index) => (
              <div key={customer.id} className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center transition-all duration-300 hover:-translate-y-1 gap-5">
                <div className="w-full md:w-auto">
                  <div className="flex justify-between items-center md:block mb-2">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest bg-amber-50 w-fit px-3 py-1 rounded-full">Position #{index + 1}</p>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 capitalize tracking-tight">{customer.customer_name}</h3>
                  <p className="text-slate-500 mt-1.5 font-mono text-sm font-medium">
                    {customer.whatsapp_number === 'Sur place' ? (
                      <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wider">Client au salon</span>
                    ) : (customer.whatsapp_number)}
                  </p>
                  {customer.notified && <span className="hidden md:flex items-center gap-1.5 mt-4 w-fit text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full"><CheckCircle2 className="w-4 h-4" /> Message envoyé</span>}
                </div>

                <div className="grid grid-cols-2 md:flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                  {customer.whatsapp_number !== 'Sur place' && (
                    <button onClick={() => handleNotify(customer)} disabled={isSendingAuth === customer.id} className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20 disabled:opacity-50 text-sm sm:text-base h-14">
                      {isSendingAuth === customer.id ? (<span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></span>) : (<><Bell className="w-4 h-4 text-amber-400" /> Alerter Client</>)}
                    </button>
                  )}
                  <button onClick={() => handleCancel(customer.id)} className="col-span-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-4 px-4 rounded-2xl transition-all active:scale-[0.98] text-sm sm:text-base h-14 border border-slate-200">
                    <UserX className="w-4 h-4" /> Absent
                  </button>
                  <button onClick={() => handleComplete(customer.id)} className="col-span-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 text-sm sm:text-base h-14">
                    <Check className="w-5 h-5" /> Terminé
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OUTILS & PARAMÈTRES */}
        <div className="mt-20 pt-10 border-t border-slate-200">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-400" /> Outils du Salon
            </h2>
            <p className="text-slate-500 font-medium mt-1">Gérez votre profil public et votre affiche QR.</p>
          </div>

          <div className="mb-6 bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-lg">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Photo du salon</label>
                  <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors h-[88px] flex items-center justify-center overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="flex items-center gap-3">
                      {profileImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={profileImage} alt="Salon" className="w-12 h-12 rounded-lg object-cover shadow-sm border border-slate-100" />
                      ) : (<UploadCloud className="w-6 h-6 text-amber-500" />)}
                      <span className="text-sm font-bold text-slate-600">
                        {uploadingImage ? 'Téléchargement...' : profileImage ? 'Changer la photo' : 'Cliquez pour uploader'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  {/* ✨ UPGRADED: Explicitly asking for a Google Maps Link */}
                  <label className="block text-sm font-bold text-slate-700 mb-2">Lien Google Maps du salon</label>
                  <div className="relative h-[88px] flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <input type="url" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="ex: https://maps.app.goo.gl/..." className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isSavingProfile} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-95 text-sm flex items-center gap-2 disabled:opacity-70">
                  <Save className="w-4 h-4 text-amber-400" /> {isSavingProfile ? 'Enregistrement...' : "Enregistrer le lien"}
                </button>
              </div>
            </form>
          </div>

          {!isLoading && shareLink && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="bg-white p-3 rounded-3xl shadow-2xl shrink-0 z-10 transform group-hover:scale-105 transition-transform duration-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl" crossOrigin="anonymous" />
              </div>
              <div className="flex-1 w-full text-center sm:text-left z-10">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center justify-center sm:justify-start gap-2 tracking-tight">
                      <QrCode className="w-6 h-6 text-amber-400" /> Affiche QR Code
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-1">Imprimez ce code et placez-le dans votre salon.</p>
                  </div>
                  <button onClick={downloadQR} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-3 px-5 rounded-xl transition-all backdrop-blur-md active:scale-[0.98] shrink-0 text-sm">
                    <Download className="w-4 h-4" /> Télécharger l'Affiche
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <input type="text" readOnly value={shareLink} className="w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-2xl outline-none font-mono text-sm text-center sm:text-left backdrop-blur-md" />
                  <button onClick={() => copyToClipboard(shareLink)} className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold py-4 px-8 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98] shrink-0">
                    {copied ? <><Check className="w-5 h-5" /> Copié</> : <><Copy className="w-5 h-5" /> Copier</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Walk-in Modal */}
        {showWalkInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button onClick={() => setShowWalkInModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="w-14 h-14 bg-amber-50 text-amber-500 flex items-center justify-center rounded-2xl mb-6 shadow-sm border border-amber-100">
                <UserPlus className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Ajouter un client</h3>
              <p className="text-slate-500 font-medium mb-6">Ajoutez rapidement une personne présente dans votre salon.</p>
              <form onSubmit={handleAddWalkIn}>
                <input type="text" autoFocus required value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all duration-300 text-base font-medium mb-6" placeholder="Prénom (ex: Karim)" />
                <button type="submit" disabled={isAddingWalkIn || !walkInName.trim()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] active:scale-[0.98] disabled:opacity-50 text-lg">
                  {isAddingWalkIn ? 'Ajout...' : 'Ajouter à la file'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}