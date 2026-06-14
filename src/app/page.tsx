import Link from 'next/link';
import { Scissors, QrCode, Smartphone, MapPin, ArrowRight, Timer, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans selection:bg-amber-200">
      
      {/* NAVBAR */}
      <nav className="absolute top-0 w-full px-6 py-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <Scissors className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-black text-2xl text-white tracking-tight">Noubba</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all">
            Connexion
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 bg-slate-900 overflow-hidden rounded-b-[3rem] shadow-2xl">
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            La nouvelle ère des salons de coiffure
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            La fin de l'attente <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              interminable au salon.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            Gérez votre file d'attente, laissez vos clients suivre leur position en temps réel depuis leur téléphone, et alertez-les quand c'est leur tour. 100% digital, 0 friction.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] text-lg">
              Créer mon Salon <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/client/signup" className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all backdrop-blur-md border border-white/10 active:scale-95 text-lg">
              Espace Client
            </Link>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS (NO MORE WHATSAPP) */}
      <div className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Comment ça marche ?</h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Une expérience fluide et moderne qui respecte le temps de vos clients et optimise l'organisation de votre salon.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Step 1 */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group hover:border-amber-200 transition-colors">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 group-hover:scale-110 transition-transform">
              <QrCode className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">1. Scan & Réservation</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Le client scanne le QR Code affiché dans votre salon ou vitrine et prend sa place virtuellement en un clic.</p>
          </div>

          {/* Step 2 (Updated from WhatsApp to Live Tracking) */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group hover:border-blue-200 transition-colors">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 group-hover:scale-110 transition-transform">
              <Timer className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">2. Suivi en Direct</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Fini l'attente sur les canapés. Le client suit sa position exacte en temps réel depuis son téléphone.</p>
          </div>

          {/* Step 3 (The Uber Method) */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group hover:border-emerald-200 transition-colors">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">3. Alerte "En Route"</h3>
            <p className="text-slate-500 font-medium leading-relaxed">Alertez-le quand c'est son tour. Il confirme qu'il est en route, et son statut devient vert sur votre tablette !</p>
          </div>

        </div>
      </div>

      {/* CTA SECTION */}
      <div className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900 to-black"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Prêt à moderniser votre salon ?</h2>
            <p className="text-slate-400 font-medium mb-8 max-w-lg mx-auto">Rejoignez les barbiers qui ont choisi Noubba pour offrir une expérience premium à leurs clients.</p>
            <Link href="/signup" className="inline-flex px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-2xl items-center justify-center gap-2 transition-all active:scale-95 text-lg">
              Créer mon compte gratuit <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Scissors className="w-5 h-5 text-amber-500" />
          <span className="font-black text-xl text-slate-900 tracking-tight">Noubba</span>
        </div>
        <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} Noubba. Conçu pour les barbiers du Maroc.</p>
      </footer>

    </div>
  );
}