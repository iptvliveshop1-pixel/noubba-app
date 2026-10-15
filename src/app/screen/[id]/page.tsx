'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { Scissors, Clock, Users, Maximize, Minimize, QrCode, Sparkles, User, CheckCircle2, Volume2, VolumeX, Globe } from 'lucide-react';

const translations = {
  fr: {
    inChair: "Au Fauteuil",
    chairFree: "Fauteuil Libre",
    nextUp: "Prochain",
    waitingList: "File d'attente",
    peopleWaiting: "en attente",
    avgWait: "Temps estimé",
    scanToJoin: "Scannez pour prendre votre place",
    salonClosed: "Le salon est actuellement fermé",
    salonOpen: "Ouvert",
    loading: "Chargement de l'affichage salon...",
    notFound: "Salon introuvable",
    minutes: "min",
    turnAlert: "C'est votre tour !",
    poweredBy: "Propulsé par Noubba"
  },
  en: {
    inChair: "In Chair",
    chairFree: "Chair Available",
    nextUp: "Next in Line",
    waitingList: "Waiting Queue",
    peopleWaiting: "waiting",
    avgWait: "Est. Wait",
    scanToJoin: "Scan to join the queue",
    salonClosed: "The salon is currently closed",
    salonOpen: "Open",
    loading: "Loading salon screen...",
    notFound: "Salon not found",
    minutes: "min",
    turnAlert: "It's your turn!",
    poweredBy: "Powered by Noubba"
  }
};

export default function SalonScreenView() {
  const params = useParams();
  const shopId = params.id as string;

  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = translations[lang];

  const [barber, setBarber] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const prevChairIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Digital clock updated every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  // Load language preference
  useEffect(() => {
    const saved = localStorage.getItem('noubba_lang');
    if (saved === 'en' || saved === 'fr') setLang(saved);
  }, []);

  const toggleLanguage = () => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('noubba_lang', next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const fetchScreenData = async () => {
    if (!shopId) return;

    // 1. Fetch Barber info (support both UUID and vanity slug)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopId);
    let barberData: any = null;

    if (isUUID) {
      const { data } = await supabase.from('barbers').select('*').eq('id', shopId).maybeSingle();
      barberData = data;
    } else {
      const { data: allBarbers } = await supabase.from('barbers').select('*');
      if (allBarbers) {
        barberData = allBarbers.find(b => {
          const s = (b.shop_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          return s === shopId.toLowerCase();
        });
      }
    }

    if (!barberData) {
      setIsLoading(false);
      return;
    }

    setBarber(barberData);
    const resolvedBarberId = barberData.id;

    // 2. Fetch Active Staff Chairs
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('barber_id', resolvedBarberId)
      .eq('is_available', true)
      .order('name', { ascending: true });

    if (staffData) setStaffList(staffData);

    // 3. Fetch Waiting & In-Chair Queue
    const { data: queueData } = await supabase
      .from('queue')
      .select(`
        *,
        staff (id, name),
        queue_services (
          services (service_name, duration_minutes)
        )
      `)
      .eq('barber_id', resolvedBarberId)
      .in('status', ['waiting', 'in_chair', 'serving'])
      .order('joined_at', { ascending: true });

    if (queueData) {
      setQueue(queueData);

      // Sound notification when a chair receives a new customer
      const currentChairs = new Set<string>();
      staffData?.forEach((st) => {
        const chairCustomer = queueData.find((q) => q.staff_id === st.id);
        if (chairCustomer) currentChairs.add(`${st.id}_${chairCustomer.id}`);
      });

      if (prevChairIds.current.size > 0 && soundEnabled && audioRef.current) {
        let hasNewChair = false;
        currentChairs.forEach((id) => {
          if (!prevChairIds.current.has(id)) hasNewChair = true;
        });
        if (hasNewChair) {
          audioRef.current.play().catch(() => {});
        }
      }
      prevChairIds.current = currentChairs;
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchScreenData();

    const channel = supabase
      .channel(`screen-view-${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
        fetchScreenData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        fetchScreenData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => {
        fetchScreenData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, soundEnabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-sm tracking-wide">{t.loading}</p>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4">
          <Scissors className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black mb-2">{t.notFound}</h2>
      </div>
    );
  }

  const toSlug = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shopSlug = barber.shop_name ? toSlug(barber.shop_name) : barber.id;
  const shareLink = `${origin}/${shopSlug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareLink)}&color=0f172a&bgcolor=ffffff`;

  const waitingQueue = queue.filter((q) => q.status === 'waiting');
  const avgWaitTime = waitingQueue.length > 0 ? Math.round((waitingQueue.length * 20) / Math.max(1, staffList.length)) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col overflow-y-auto lg:overflow-hidden select-none relative">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      {/* TOP TV HEADER: Responsive on mobile, spacious on TV */}
      <header className="min-h-20 lg:h-24 bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-8 py-3 lg:py-0 flex items-center justify-between shrink-0 backdrop-blur-md z-20 gap-3">
        <div className="flex items-center gap-3 sm:gap-5">
          {barber.profile_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={barber.profile_image_url} alt="Logo" className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg shrink-0" />
          ) : (
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
              <Scissors className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight leading-none text-white truncate">{barber.shop_name}</h1>
            <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${barber.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{barber.is_open ? t.salonOpen : t.salonClosed}</span>
            </div>
          </div>
        </div>

        {/* DIGITAL CLOCK & CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-2xl flex items-center gap-2 sm:gap-3 shadow-inner">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
            <span className="font-mono text-base sm:text-2xl xl:text-3xl font-black tracking-wider text-white">{currentTime}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleLanguage}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1"
              title="Langue"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono uppercase text-[11px] sm:text-xs">{lang === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</span>
            </button>

            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled && audioRef.current) {
                  audioRef.current.play().catch(() => {});
                }
              }}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all ${soundEnabled ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              title="Sonnerie"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* RESPONSIVE SCREEN GRID: Stacks on mobile portrait, 12-cols on TV & landscape */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 overflow-y-auto lg:overflow-hidden">
        
        {/* ACTIVE BARBER CHAIRS */}
        <section className="w-full lg:col-span-8 flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-slate-300">Fauteuils en direct</h2>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{staffList.length} poste{staffList.length > 1 ? 's' : ''} actif{staffList.length > 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 overflow-y-auto pr-1">
            {staffList.map((chairStaff) => {
              const chairQueue = queue.filter((q) => q.staff_id === chairStaff.id);
              const currentClient = chairQueue[0];
              const nextClient = chairQueue[1];

              return (
                <div
                  key={chairStaff.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl lg:rounded-[2.5rem] p-5 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

                  {/* Chair Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center font-black">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight">{chairStaff.name}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fauteuil de coiffure</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-bold text-slate-300">
                      {chairQueue.length} {t.peopleWaiting}
                    </span>
                  </div>

                  {/* Current Client In Chair */}
                  <div className="my-5 sm:my-6">
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block mb-2">
                      {t.inChair}
                    </span>
                    {currentClient ? (
                      <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 shadow-inner animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xl sm:text-2xl font-black text-white capitalize leading-tight tracking-tight">
                            {currentClient.customers?.full_name || currentClient.customer_name}
                          </h4>
                          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                        </div>
                        {currentClient.queue_services && currentClient.queue_services.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {currentClient.queue_services.map((qs: any, idx: number) => qs.services && (
                              <span key={idx} className="bg-slate-800/80 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700/60 uppercase">
                                {qs.services.service_name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 text-center text-slate-500 font-bold text-sm">
                        {t.chairFree}
                      </div>
                    )}
                  </div>

                  {/* Next Up In Line */}
                  <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">{t.nextUp}</span>
                    {nextClient ? (
                      <span className="font-black text-white capitalize text-sm">
                        {nextClient.customers?.full_name || nextClient.customer_name}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-bold">--</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* OVERALL QUEUE & QR CODE CHECK-IN */}
        <section className="w-full lg:col-span-4 flex flex-col gap-6">
          
          {/* STATS CARD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl lg:rounded-[2.5rem] p-5 sm:p-6 shadow-xl flex items-center justify-around text-center shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.waitingList}</p>
              <h3 className="text-3xl sm:text-4xl font-black text-white">{waitingQueue.length}</h3>
              <span className="text-xs font-bold text-slate-500">{t.peopleWaiting}</span>
            </div>
            <div className="h-12 w-px bg-slate-800"></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.avgWait}</p>
              <h3 className="text-3xl sm:text-4xl font-black text-amber-400">~{avgWaitTime}</h3>
              <span className="text-xs font-bold text-slate-500">{t.minutes}</span>
            </div>
          </div>

          {/* UPCOMING TICKETS LIST */}
          <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl lg:rounded-[2.5rem] p-5 sm:p-6 shadow-xl flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Ordre de passage
            </h3>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {waitingQueue.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm font-bold">
                  Aucun client en attente.
                </div>
              ) : (
                waitingQueue.slice(0, 8).map((client, index) => (
                  <div
                    key={client.id}
                    className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                      index === 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-white">
                        #{index + 1}
                      </div>
                      <span className="font-bold capitalize text-sm text-white">
                        {client.customers?.full_name || client.customer_name}
                      </span>
                    </div>

                    {client.staff?.name && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {client.staff.name}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QR CODE CHECK-IN POSTER CARD */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl lg:rounded-[2.5rem] p-5 sm:p-6 text-slate-950 shadow-2xl flex items-center gap-4 sm:gap-5 shrink-0">
            <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded-xl" crossOrigin="anonymous" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 bg-slate-950/15 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5">
                <QrCode className="w-3 h-3" /> Scan & Go
              </div>
              <h4 className="text-base sm:text-lg font-black leading-tight tracking-tight">{t.scanToJoin}</h4>
              <p className="text-slate-950/70 text-xs font-bold mt-1">Prenez votre ticket sur votre smartphone</p>
            </div>
          </div>

        </section>

      </main>

      {/* FOOTER TICKER */}
      <footer className="h-10 bg-slate-950 border-t border-slate-800/60 px-4 sm:px-8 flex items-center justify-between text-[11px] text-slate-500 font-bold shrink-0">
        <span>{t.poweredBy}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Synchronisation en direct</span>
        </div>
      </footer>

    </div>
  );
}