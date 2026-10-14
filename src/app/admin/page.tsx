'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  LogOut, CheckCircle, XCircle, Store, ShieldAlert, Users, Search, 
  ChevronLeft, MessageCircle, MapPin, Trash2, PauseCircle, PlayCircle, 
  RefreshCw, Scissors, Clock, Eye, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

type Barber = {
  id: string;
  user_id: string;
  shop_name: string;
  owner_name: string;
  location?: string;
  profile_image_url?: string;
  is_open?: boolean;
  is_active?: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  owner_phone?: string;
};

export default function AdminDashboard() {
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Platform-wide Metrics
  const [liveQueuedCount, setLiveQueuedCount] = useState<number>(0);
  const [servedTodayCount, setServedTodayCount] = useState<number>(0);

  const router = useRouter();

  useEffect(() => {
    fetchBarbersAndMetrics();
  }, []);

  const fetchBarbersAndMetrics = async () => {
    setIsLoading(true);
    
    // CEO Gatekeeper Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== 'zrirjawad@gmail.com') {
      router.push('/dashboard');
      return;
    }

    // 1. Fetch Barbers
    const { data: barbersData, error: barbersError } = await supabase
      .from('barbers')
      .select('*')
      .order('created_at', { ascending: false });

    if (barbersError) {
      toast.error("Erreur de chargement des salons.");
      setIsLoading(false);
      return;
    }

    // 2. Fetch Owner Phone Numbers from customers table
    if (barbersData && barbersData.length > 0) {
      const userIds = barbersData.map(b => b.user_id).filter(Boolean);
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, phone_number')
        .in('id', userIds);

      const phoneMap = new Map((customersData || []).map(c => [c.id, c.phone_number]));

      const enriched = barbersData.map(b => ({
        ...b,
        owner_phone: phoneMap.get(b.user_id) || ''
      }));

      setAllBarbers(enriched);
    } else {
      setAllBarbers([]);
    }

    // 3. Platform Live Metrics
    try {
      // Live Queue Count (Currently waiting or frozen across Morocco)
      const { count: waitingCount } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .in('status', ['waiting', 'frozen']);
      setLiveQueuedCount(waitingCount || 0);

      // Clients served today
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const { count: completedToday } = await supabase
        .from('queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('joined_at', todayMidnight.toISOString());
      setServedTodayCount(completedToday || 0);
    } catch (e) {
      console.error("Metrics load error:", e);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBarbersAndMetrics();
  };

  // 1. Approve / Activate Salon
  const handleApprove = async (id: string, shopName: string) => {
    const toastId = toast.loading("Activation du salon...");
    const { error } = await supabase
      .from('barbers')
      .update({ approval_status: 'approved', is_active: true })
      .eq('id', id);
    
    if (!error) {
      toast.success(`${shopName} est maintenant actif !`, { id: toastId });
      setAllBarbers(prev => prev.map(b => b.id === id ? { ...b, approval_status: 'approved', is_active: true } : b));
    } else {
      toast.error("Erreur d'approbation.", { id: toastId });
    }
  };

  // 2. Soft-Suspension (Safe: Zero Data Loss)
  const handleSuspend = async (id: string, shopName: string) => {
    const confirm = window.confirm(`Suspendre le salon "${shopName}" ? Les clients ne pourront plus rejoindre sa file d'attente, mais toutes ses données restent conservées.`);
    if (!confirm) return;

    const toastId = toast.loading("Suspension...");
    const { error } = await supabase
      .from('barbers')
      .update({ approval_status: 'rejected', is_active: false })
      .eq('id', id);
    
    if (!error) {
      toast(`${shopName} a été suspendu.`, { id: toastId, icon: '⏸️' });
      setAllBarbers(prev => prev.map(b => b.id === id ? { ...b, approval_status: 'rejected', is_active: false } : b));
    } else {
      toast.error("Erreur lors de la suspension.", { id: toastId });
    }
  };

  // 3. Reactivate Suspended Salon
  const handleReactivate = async (id: string, shopName: string) => {
    const toastId = toast.loading("Réactivation du salon...");
    const { error } = await supabase
      .from('barbers')
      .update({ approval_status: 'approved', is_active: true })
      .eq('id', id);
    
    if (!error) {
      toast.success(`${shopName} réactivé avec succès !`, { id: toastId });
      setAllBarbers(prev => prev.map(b => b.id === id ? { ...b, approval_status: 'approved', is_active: true } : b));
    } else {
      toast.error("Erreur de réactivation.", { id: toastId });
    }
  };

  // 4. Permanent Delete (Hard Delete only for spam/test salons with double confirm)
  const handlePermanentDelete = async (id: string, shopName: string) => {
    const prompt = window.prompt(`ATTENTION : Cela supprimera DÉFINITIVEMENT le salon "${shopName}", ses coiffeurs et tout son historique.\n\nTapez "SUPPRIMER" pour confirmer :`);
    if (prompt !== 'SUPPRIMER') {
      toast("Suppression annulée.");
      return;
    }

    const toastId = toast.loading("Suppression définitive...");
    const { error } = await supabase.from('barbers').delete().eq('id', id);
    
    if (!error) {
      toast.success("Salon définitivement supprimé.", { id: toastId });
      setAllBarbers(prev => prev.filter(b => b.id !== id));
    } else {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Counts
  const pendingCount = allBarbers.filter(b => b.approval_status === 'pending').length;
  const activeCount = allBarbers.filter(b => b.approval_status === 'approved' && b.is_active !== false).length;
  const suspendedCount = allBarbers.filter(b => b.approval_status === 'rejected' || b.is_active === false).length;

  // Filtered List based on Search & Tabs
  const filteredBarbers = allBarbers.filter(barber => {
    const matchesSearch = 
      barber.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barber.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (barber.location && barber.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (barber.owner_phone && barber.owner_phone.includes(searchQuery));

    if (!matchesSearch) return false;

    if (selectedTab === 'pending') return barber.approval_status === 'pending';
    if (selectedTab === 'approved') return barber.approval_status === 'approved' && barber.is_active !== false;
    if (selectedTab === 'rejected') return barber.approval_status === 'rejected' || barber.is_active === false;
    return true;
  });

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
      
      {/* CEO HERO SECTION */}
      <div className="min-h-[26vh] pt-10 pb-8 w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        <div className="absolute top-4 sm:top-6 w-full left-0 px-4 sm:px-6 flex justify-between items-center z-20">
          <Link href="/" className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md">
            <ChevronLeft className="w-5 h-5 pr-0.5" />
          </Link>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button 
              onClick={handleLogout} 
              className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 active:scale-95 transition-all backdrop-blur-md"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-6 sm:mt-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldAlert className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">Administration Noubba</h1>
              <p className="text-slate-400 font-medium text-xs mt-1">Supervision globale et contrôle des salons</p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT SHEET */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-6 relative z-20 px-4 sm:px-8 pt-6 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        
        {/* PLATFORM PULSE METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Salons Actifs</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{activeCount}</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">En Attente</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{pendingCount}</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clients en File</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-blue-600">{liveQueuedCount}</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Scissors className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Servis Aujourd'hui</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-purple-600">{servedTodayCount}</span>
          </div>
        </div>

        {/* SEARCH BAR & TABS */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom de salon, propriétaire, ville, téléphone..."
              className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedTab === 'all' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({allBarbers.length})
            </button>
            <button
              onClick={() => setSelectedTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedTab === 'pending' 
                  ? 'bg-amber-500 text-slate-900 shadow-sm' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              En Attente ({pendingCount})
            </button>
            <button
              onClick={() => setSelectedTab('approved')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedTab === 'approved' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Actifs ({activeCount})
            </button>
            <button
              onClick={() => setSelectedTab('rejected')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedTab === 'rejected' 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Suspendus ({suspendedCount})
            </button>
          </div>
        </div>

        {/* SALON LIST */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-28 bg-white rounded-3xl border border-slate-100 animate-pulse w-full"></div>
              ))}
            </div>
          ) : filteredBarbers.length === 0 ? (
            <div className="bg-white border border-slate-200/60 border-dashed rounded-3xl p-10 text-center">
              <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">Aucun salon ne correspond à votre recherche.</p>
            </div>
          ) : (
            filteredBarbers.map((barber) => {
              const isPending = barber.approval_status === 'pending';
              const isSuspended = barber.approval_status === 'rejected' || barber.is_active === false;
              const isApproved = barber.approval_status === 'approved' && barber.is_active !== false;

              const cleanPhone = (barber.owner_phone || '').replace(/\D/g, '');
              const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace(/^0/, '212')}?text=${encodeURIComponent(`Salam ${barber.owner_name}, c'est Jawad de Noubba ! Bienvenue sur la plateforme.`)}` : null;

              return (
                <div 
                  key={barber.id} 
                  className={`bg-white p-5 rounded-3xl border shadow-sm transition-all flex flex-col gap-4 ${
                    isPending 
                      ? 'border-amber-200/80 bg-amber-50/20' 
                      : isSuspended 
                      ? 'border-red-200/80 bg-red-50/10 opacity-90' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {barber.profile_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={barber.profile_image_url} alt="" className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-amber-400 font-black text-lg shrink-0">
                          {barber.shop_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{barber.shop_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPending 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : isSuspended 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isPending ? 'En Attente' : isSuspended ? 'Suspendu' : 'Actif'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700">{barber.owner_name}</span>
                          {barber.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-slate-400 truncate max-w-[150px]">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {barber.location}
                              </span>
                            </>
                          )}
                          {cleanPhone && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-500">{barber.owner_phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick WhatsApp Contact */}
                    {waLink && (
                      <a 
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-200 transition-colors"
                        title="Contacter le propriétaire sur WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    {isPending && (
                      <>
                        <button 
                          onClick={() => handleApprove(barber.id, barber.shop_name)} 
                          className="flex-1 h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Approuver le Salon
                        </button>
                        <button 
                          onClick={() => handleSuspend(barber.id, barber.shop_name)} 
                          className="h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                          title="Refuser et suspendre"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-500" /> Refuser
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <>
                        <Link 
                          href={`/q/${barber.id}`}
                          target="_blank"
                          className="flex-1 h-10 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> Vitrine Client
                        </Link>
                        <Link 
                          href={`/screen/${barber.id}`}
                          target="_blank"
                          className="h-10 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-amber-200/50"
                        >
                          <Scissors className="w-3.5 h-3.5 text-amber-600" /> Écran TV
                        </Link>
                        <button 
                          onClick={() => handleSuspend(barber.id, barber.shop_name)} 
                          className="h-10 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200/60"
                          title="Mettre en pause le salon sans effacer ses données"
                        >
                          <PauseCircle className="w-3.5 h-3.5 text-red-500" /> Suspendre
                        </button>
                      </>
                    )}

                    {isSuspended && (
                      <>
                        <button 
                          onClick={() => handleReactivate(barber.id, barber.shop_name)} 
                          className="flex-1 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Réactiver le Salon
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete(barber.id, barber.shop_name)} 
                          className="h-10 px-3 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                          title="Supprimer définitivement ce salon"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}