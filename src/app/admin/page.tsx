'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Store, Check, Link as LinkIcon, LogOut, CheckCircle2, Coffee } from 'lucide-react';

export default function AdminDashboard() {
  const [pendingBarbers, setPendingBarbers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 👑 DEFINING THE BOSS: Only this exact email can bypass the Bouncer
  const ADMIN_EMAIL = "zrirjawad@gmail.com"; 

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 🛡️ THE BOUNCER: Kick them out if they aren't logged in OR if they aren't you!
      if (!session || session.user.email !== ADMIN_EMAIL) {
        window.location.href = '/login';
        return;
      }

      // If it is you, fetch barbers who are waiting for approval
      const { data } = await supabase
        .from('barbers')
        .select('*')
        .eq('approval_status', 'pending');
        
      if (data) setPendingBarbers(data);
      setIsLoading(false);
    };

    checkAdminAndFetch();
  }, []);

  const handleApprove = async (barberId: string) => {
    const toastId = toast.loading("Approbation en cours...", { style: { borderRadius: '12px' }}); 
    
    const { error } = await supabase
      .from('barbers')
      .update({ approval_status: 'approved' })
      .eq('id', barberId);

    if (!error) {
      setPendingBarbers(prev => prev.filter(b => b.id !== barberId));
      toast.success("Barbier approuvé avec succès !", { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' }});
    } else {
      toast.error("Erreur lors de l'approbation.", { id: toastId });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 selection:bg-amber-200">
      
      {/* Floating Admin Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 mb-8">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl shadow-md">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Espace Admin</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Noubba HQ</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors active:scale-95">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Quitter</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Approbations en attente</h2>
          <p className="text-slate-500 font-medium mt-1">Examinez et validez les nouveaux salons.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5 animate-pulse">
                <div className="w-full md:w-1/2">
                  <div className="h-7 bg-slate-200 rounded-lg w-48 mb-3"></div>
                  <div className="h-4 bg-slate-100 rounded-full w-32 mb-4"></div>
                  <div className="h-8 bg-slate-50 rounded-lg w-64"></div>
                </div>
                <div className="h-14 bg-slate-200 rounded-2xl w-full md:w-40"></div>
              </div>
            ))}
          </div>
        ) : pendingBarbers.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Tout est à jour</h3>
            <p className="text-slate-500 font-medium">Aucun barbier en attente d'approbation pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {pendingBarbers.map((barber) => (
              <div 
                key={barber.id} 
                className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-full md:w-auto">
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-2 flex items-center gap-2 tracking-tight">
                    <Store className="w-6 h-6 text-amber-500" /> {barber.shop_name}
                  </h3>
                  <p className="text-slate-500 font-medium flex items-center gap-2 mb-4">
                    Propriétaire: <span className="text-slate-900 font-bold">{barber.owner_name}</span>
                  </p>
                  <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-mono text-slate-600">
                      noubba.com/{barber.owner_name.toLowerCase().replace(/\s+/g, '-')}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleApprove(barber.id)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] shrink-0"
                >
                  <Check className="w-6 h-6" /> Approuver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}