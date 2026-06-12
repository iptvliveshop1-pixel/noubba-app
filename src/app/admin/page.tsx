'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LogOut, CheckCircle, XCircle, Store, ShieldAlert, Users, Search, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [pendingBarbers, setPendingBarbers] = useState<any[]>([]);
  const [activeBarbers, setActiveBarbers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    setIsLoading(true);
    
    // Check if it's the CEO
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== 'zrirjawad@gmail.com') {
      router.push('/dashboard');
      return;
    }

    const { data, error } = await supabase.from('barbers').select('*').order('created_at', { ascending: false });
    
    if (data) {
      setPendingBarbers(data.filter(b => b.approval_status === 'pending'));
      setActiveBarbers(data.filter(b => b.approval_status === 'approved'));
    }
    setIsLoading(false);
  };

  const handleApprove = async (id: string, shopName: string) => {
    const toastId = toast.loading("Approbation en cours...");
    const { error } = await supabase.from('barbers').update({ approval_status: 'approved' }).eq('id', id);
    
    if (!error) {
      toast.success(`${shopName} est maintenant en ligne !`, { id: toastId });
      fetchBarbers();
    } else {
      toast.error("Erreur d'approbation.", { id: toastId });
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce salon ?")) return;
    const toastId = toast.loading("Suppression...");
    const { error } = await supabase.from('barbers').delete().eq('id', id);
    
    if (!error) {
      toast.success("Salon supprimé.", { id: toastId });
      fetchBarbers();
    } else {
      toast.error("Erreur de suppression.", { id: toastId });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-amber-200">
      
      {/* CEO HERO SECTION */}
      <div className="min-h-[30vh] pt-12 pb-8 w-full bg-slate-900 relative flex flex-col justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        <div className="absolute top-4 sm:top-6 w-full left-0 px-4 flex justify-between items-center z-20">
          <Link href="/" className="w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all backdrop-blur-md">
            <ChevronLeft className="w-5 h-5 pr-0.5" />
          </Link>
          <button onClick={handleLogout} className="w-10 h-10 shrink-0 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 active:scale-95 transition-all backdrop-blur-md">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 mt-10">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-7 h-7 text-slate-900" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-2">Espace Admin</h1>
          <p className="text-slate-400 font-medium text-sm">Contrôle central de Noubba SaaS.</p>
        </div>
      </div>

      {/* MAIN CONTENT SHEET */}
      <div className="flex-1 bg-slate-50 rounded-t-[2.5rem] -mt-8 relative z-20 px-4 sm:px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        
        {/* STATS ROW */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-5 h-5 text-amber-500" /><span className="text-xs font-bold text-slate-500 uppercase">En Attente</span></div>
            <span className="text-3xl font-black text-slate-900">{pendingBarbers.length}</span>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-emerald-500" /><span className="text-xs font-bold text-slate-500 uppercase">Actifs</span></div>
            <span className="text-3xl font-black text-slate-900">{activeBarbers.length}</span>
          </div>
        </div>

        {/* PENDING APPROVALS */}
        <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight">Demandes d'activation</h2>
        {isLoading ? (
          <div className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse w-full mb-8"></div>
        ) : pendingBarbers.length === 0 ? (
          <div className="bg-slate-100/50 border border-slate-200/60 border-dashed rounded-3xl p-8 text-center mb-8">
            <p className="text-slate-500 font-bold text-sm">Aucune demande en attente.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-10">
            {pendingBarbers.map((barber) => (
              <div key={barber.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-amber-100 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100/50">
                    <Store className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{barber.shop_name}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase mt-0.5">{barber.owner_name}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full mt-2">
                  <button onClick={() => handleApprove(barber.id, barber.shop_name)} className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-900 active:bg-slate-800 text-white font-bold rounded-xl transition-all text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Activer
                  </button>
                  <button onClick={() => handleReject(barber.id)} className="w-14 h-12 flex items-center justify-center bg-slate-50 text-slate-500 active:bg-slate-100 rounded-xl border border-slate-200 transition-all shrink-0">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ACTIVE BARBERS */}
        <h2 className="text-xl font-black text-slate-900 mb-4 tracking-tight flex items-center justify-between">
          Salons Actifs
        </h2>
        <div className="space-y-3">
          {activeBarbers.map((barber) => (
            <div key={barber.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-slate-900 font-black">{barber.shop_name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{barber.shop_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <p className="text-slate-400 text-xs font-medium">{barber.owner_name}</p>
                  </div>
                </div>
              </div>
              <Link href={`/${barber.owner_name.toLowerCase().replace(/\s+/g, '-')}`} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100">
                <Search className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}