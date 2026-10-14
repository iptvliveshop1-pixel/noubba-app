'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Users, DollarSign, BarChart3, Scissors, Wallet, User, UserX, Clock } from 'lucide-react';
import Link from 'next/link';

type Timeframe = 'today' | 'week' | 'month';

export default function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [shopName, setShopName] = useState('');
  
  // Metrics State
  const [totalClients, setTotalClients] = useState(0);
  const [noShowCount, setNoShowCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageBasket, setAverageBasket] = useState(0);
  const [popularServices, setPopularServices] = useState<{name: string, count: number, revenue: number}[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<{name: string, clients: number, revenue: number}[]>([]);
  const [peakHours, setPeakHours] = useState<{slot: string, count: number}[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Get Barber ID
      const { data: barber } = await supabase
        .from('barbers')
        .select('id, shop_name')
        .eq('user_id', session.user.id)
        .single();

      if (!barber) {
        router.push('/dashboard');
        return;
      }
      setShopName(barber.shop_name);

      // 2. Set Start Time based on selected timeframe
      const startDate = new Date();
      if (timeframe === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'week') {
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'month') {
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }
      const isoStart = startDate.toISOString();

      // 3. Query completed and cancelled tickets
      const { data: allTickets, error } = await supabase
        .from('queue')
        .select(`
          id,
          status,
          joined_at,
          staff (name),
          queue_services (
            services (service_name, price_dh)
          )
        `)
        .eq('barber_id', barber.id)
        .in('status', ['completed', 'cancelled'])
        .gte('joined_at', isoStart);

      if (error) {
        console.error("Analytics Error:", error);
        setIsLoading(false);
        return;
      }

      if (allTickets) {
        const completedTickets = allTickets.filter(t => t.status === 'completed');
        const cancelledTickets = allTickets.filter(t => t.status === 'cancelled');

        setTotalClients(completedTickets.length);
        setNoShowCount(cancelledTickets.length);

        let revenueCount = 0;
        const serviceStats: Record<string, { count: number, revenue: number }> = {};
        const staffStats: Record<string, { clients: number, revenue: number }> = {};
        const hourBuckets: Record<string, number> = {};

        completedTickets.forEach(ticket => {
          let ticketRevenue = 0;

          if (ticket.joined_at) {
            const hour = new Date(ticket.joined_at).getHours();
            const slotLabel = `${String(hour).padStart(2, '0')}h00 - ${String(hour + 1).padStart(2, '0')}h00`;
            hourBuckets[slotLabel] = (hourBuckets[slotLabel] || 0) + 1;
          }

          if (ticket.queue_services) {
            ticket.queue_services.forEach((qs: any) => {
              if (qs.services) {
                const price = qs.services.price_dh || 0;
                const name = qs.services.service_name;
                
                ticketRevenue += price;
                revenueCount += price;

                if (!serviceStats[name]) {
                  serviceStats[name] = { count: 0, revenue: 0 };
                }
                serviceStats[name].count += 1;
                serviceStats[name].revenue += price;
              }
            });
          }

          const staffName = (ticket.staff as any)?.name || 'Non assigné';
          if (!staffStats[staffName]) {
            staffStats[staffName] = { clients: 0, revenue: 0 };
          }
          staffStats[staffName].clients += 1;
          staffStats[staffName].revenue += ticketRevenue;
        });

        setTotalRevenue(revenueCount);
        setAverageBasket(completedTickets.length > 0 ? Math.round(revenueCount / completedTickets.length) : 0);

        const sortedServices = Object.keys(serviceStats)
          .map(key => ({
            name: key,
            count: serviceStats[key].count,
            revenue: serviceStats[key].revenue
          }))
          .sort((a, b) => b.count - a.count);

        setPopularServices(sortedServices);

        const sortedStaff = Object.keys(staffStats)
          .map(key => ({
            name: key,
            clients: staffStats[key].clients,
            revenue: staffStats[key].revenue
          }))
          .sort((a, b) => b.revenue - a.revenue);

        setStaffPerformance(sortedStaff);

        const sortedHours = Object.keys(hourBuckets)
          .map(slot => ({ slot, count: hourBuckets[slot] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setPeakHours(sortedHours);
      }

      setIsLoading(false);
    };

    fetchAnalytics();
  }, [router, timeframe]);

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'today':
        return "Aujourd'hui";
      case 'week':
        return "7 Derniers Jours";
      case 'month':
        return "30 Derniers Jours";
    }
  };

  const maxHourCount = peakHours.length > 0 ? Math.max(...peakHours.map(h => h.count), 1) : 1;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans selection:bg-amber-200">
      
      {/* HEADER */}
      <div className="bg-slate-900 pt-8 pb-12 px-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="w-10 h-10 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-full flex items-center justify-center text-white active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-300 tracking-tight leading-none">Tableau de bord</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{shopName}</p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-black uppercase tracking-widest mb-3 border border-amber-500/30">
            <BarChart3 className="w-3.5 h-3.5" /> Statistiques & Recettes
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Performance<br />
            <span className="text-amber-400">{getTimeframeLabel()}</span>
          </h2>
        </div>

        {/* TIMEFRAME SELECTOR PILLS */}
        <div className="relative z-10 mt-6 flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 max-w-sm">
          <button
            onClick={() => setTimeframe('today')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'today'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'week'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            7 Jours
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === 'month'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-[1.02]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            30 Jours
          </button>
        </div>
      </div>

      {/* METRICS DASHBOARD */}
      <div className="flex-1 px-4 sm:px-6 -mt-6 relative z-20 pb-20">
        
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-32 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse"></div>
              <div className="h-32 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse"></div>
            </div>
            <div className="h-28 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse"></div>
          </div>
        ) : (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recettes</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{totalRevenue} <span className="text-xs font-bold text-slate-500">DH</span></h3>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 border border-blue-100">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Clients Servis</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{totalClients}</h3>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-red-100 flex flex-col justify-between">
                <div className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-3 border border-red-100">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">No-Shows / Annulés</p>
                  <h3 className="text-xl sm:text-2xl font-black text-red-600">{noShowCount}</h3>
                </div>
              </div>

              <div className="col-span-3 bg-slate-900 p-5 rounded-3xl shadow-lg shadow-slate-900/10 border border-slate-800 flex items-center justify-between group overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <Wallet className="w-32 h-32 text-white" />
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Panier Moyen</p>
                  <h3 className="text-3xl font-black text-white">{averageBasket} <span className="text-lg font-bold text-slate-500">DH / client</span></h3>
                </div>
                <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 relative z-10">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* TEAM PERFORMANCE LEDGER */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-tight">Performances de l'équipe</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{getTimeframeLabel()}</p>
                </div>
              </div>
              
              <div className="p-3">
                {staffPerformance.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 font-bold text-sm">Aucune coupe enregistrée sur cette période.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffPerformance.map((staff, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 font-black text-xs rounded-lg flex items-center justify-center border border-blue-100">
                            {staff.clients}
                            <Users className="w-3 h-3 ml-0.5 opacity-50" />
                          </div>
                          <span className="font-bold text-slate-700 capitalize">{staff.name}</span>
                        </div>
                        <span className="font-black text-emerald-600">{staff.revenue} <span className="text-xs text-emerald-600/70 font-bold">DH</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PEAK HOURS LEDGER */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-tight">Heures de Pointe</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Créneaux les plus fréquentés</p>
                </div>
              </div>
              <div className="p-4">
                {peakHours.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-slate-400 font-bold text-sm">Pas encore de données horaires.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {peakHours.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="font-mono text-slate-700">{item.slot}</span>
                          <span className="text-slate-900 font-black">{item.count} client(s)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ width: `${Math.round((item.count / maxHourCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* POPULAR SERVICES LEDGER */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Scissors className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 leading-tight">Prestations Réalisées</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{getTimeframeLabel()}</p>
                </div>
              </div>
              
              <div className="p-3">
                {popularServices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 font-bold text-sm">Aucune prestation terminée sur cette période.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {popularServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 text-slate-500 font-black text-xs rounded-lg flex items-center justify-center">
                            {service.count}x
                          </div>
                          <span className="font-bold text-slate-700">{service.name}</span>
                        </div>
                        <span className="font-black text-slate-900">{service.revenue} <span className="text-xs text-slate-400">DH</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}