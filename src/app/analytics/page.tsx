'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Users, DollarSign, BarChart3, Scissors, Wallet, User } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [shopName, setShopName] = useState('');
  
  // Metrics State
  const [totalClients, setTotalClients] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageBasket, setAverageBasket] = useState(0);
  const [popularServices, setPopularServices] = useState<{name: string, count: number, revenue: number}[]>([]);
  
  // ✨ NEW: Staff Performance State
  const [staffPerformance, setStaffPerformance] = useState<{name: string, clients: number, revenue: number}[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchAnalytics = async () => {
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

      // 2. Set Timeframe to "Today" (Midnight to Midnight)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const isoStart = startOfDay.toISOString();

      // ✨ FIX: Added staff(name) to the query to track individual performance
      const { data: completedTickets, error } = await supabase
        .from('queue')
        .select(`
          id,
          staff (name),
          queue_services (
            services (service_name, price_dh)
          )
        `)
        .eq('barber_id', barber.id)
        .eq('status', 'completed')
        .gte('joined_at', isoStart);

      if (error) {
        console.error("Analytics Error:", error);
        setIsLoading(false);
        return;
      }

      if (completedTickets) {
        setTotalClients(completedTickets.length);

        let revenueCount = 0;
        const serviceStats: Record<string, { count: number, revenue: number }> = {};
        const staffStats: Record<string, { clients: number, revenue: number }> = {};

        // Crunch the numbers
        completedTickets.forEach(ticket => {
          let ticketRevenue = 0;

          if (ticket.queue_services) {
            ticket.queue_services.forEach((qs: any) => {
              if (qs.services) {
                const price = qs.services.price_dh || 0;
                const name = qs.services.service_name;
                
                ticketRevenue += price;
                revenueCount += price;

                // Track popular services
                if (!serviceStats[name]) {
                  serviceStats[name] = { count: 0, revenue: 0 };
                }
                serviceStats[name].count += 1;
                serviceStats[name].revenue += price;
              }
            });
          }

          // ✨ NEW: Track Individual Staff Performance
          const staffName = (ticket.staff as any)?.name || 'Non assigné';
          if (!staffStats[staffName]) {
            staffStats[staffName] = { clients: 0, revenue: 0 };
          }
          staffStats[staffName].clients += 1;
          staffStats[staffName].revenue += ticketRevenue;
        });

        setTotalRevenue(revenueCount);
        setAverageBasket(completedTickets.length > 0 ? Math.round(revenueCount / completedTickets.length) : 0);

        // Convert the service stats object into an array and sort by most popular
        const sortedServices = Object.keys(serviceStats)
          .map(key => ({
            name: key,
            count: serviceStats[key].count,
            revenue: serviceStats[key].revenue
          }))
          .sort((a, b) => b.count - a.count);

        setPopularServices(sortedServices);

        // ✨ NEW: Convert staff stats into an array and sort by highest revenue
        const sortedStaff = Object.keys(staffStats)
          .map(key => ({
            name: key,
            clients: staffStats[key].clients,
            revenue: staffStats[key].revenue
          }))
          .sort((a, b) => b.revenue - a.revenue);

        setStaffPerformance(sortedStaff);
      }

      setIsLoading(false);
    };

    fetchAnalytics();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans selection:bg-amber-200">
      
      {/* HEADER */}
      <div className="bg-slate-900 pt-8 pb-12 px-6 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
        
        <div className="relative z-10 flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="w-10 h-10 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-full flex items-center justify-center text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-slate-300 tracking-tight">Retour au tableau de bord</h1>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-black uppercase tracking-widest mb-3 border border-amber-500/30">
            <BarChart3 className="w-3 h-3" /> Statistiques en direct
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">Performance<br/>Aujourd'hui</h2>
        </div>
      </div>

      {/* METRICS DASHBOARD */}
      <div className="flex-1 px-4 sm:px-6 -mt-6 relative z-20 pb-20">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires</p>
              <h3 className="text-2xl font-black text-slate-900">{totalRevenue} <span className="text-sm font-bold text-slate-500">DH</span></h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clients Servis</p>
              <h3 className="text-2xl font-black text-slate-900">{totalClients}</h3>
            </div>
          </div>

          <div className="col-span-2 bg-slate-900 p-5 rounded-3xl shadow-lg shadow-slate-900/10 border border-slate-800 flex items-center justify-between group overflow-hidden relative">
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

        {/* ✨ NEW: TEAM PERFORMANCE LEDGER */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-black text-slate-900">Performances de l'équipe</h3>
          </div>
          
          <div className="p-3">
            {staffPerformance.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 font-bold text-sm">Aucun coiffeur n'a terminé de coupe aujourd'hui.</p>
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

        {/* POPULAR SERVICES LEDGER */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
              <Scissors className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="font-black text-slate-900">Prestations Réalisées</h3>
          </div>
          
          <div className="p-3">
            {popularServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 font-bold text-sm">Aucune prestation terminée aujourd'hui.</p>
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

      </div>
    </div>
  );
}