import { Link } from '@/lib/router';
import { useAuth, ROLE_HOME } from '@/lib/auth';
import type { UserRole } from '@/types';
import { Ornament } from '@/components/ui';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Youtube, ShieldCheck, BadgeCheck, Headphones, Calendar, ArrowRight } from 'lucide-react';

const linkColumns = [
  {
    title: 'Discover',
    links: [
      { label: 'All Pujas', to: '/explore' },
      { label: 'Find a Pandit', to: '/pandits' },
      { label: 'Samagri Store', to: '/samagri' },
      { label: 'AI Assistant', to: '/ai-assistant' },
    ],
  },
  {
    title: 'Popular',
    links: [
      { label: 'Griha Pravesh', to: '/explore?q=Griha Pravesh' },
      { label: 'Lakshmi Puja', to: '/explore?q=Lakshmi' },
      { label: 'Satyanarayan Katha', to: '/explore?q=Satyanarayan' },
      { label: 'Rudrabhishek', to: '/explore?q=Rudrabhishek' },
    ],
  },
];

/** Account links follow the signed-in role, so pandits and admins aren't sent to the devotee dashboard. */
function accountLinks(role: UserRole | undefined): { label: string; to: string }[] {
  if (!role) {
    return [
      { label: 'My Bookings', to: '/dashboard/bookings' },
      { label: 'Sign In / Sign Up', to: '/auth' },
      { label: 'Join as a Pandit', to: '/auth?mode=signup&role=pandit' },
    ];
  }
  if (role === 'pandit') {
    return [
      { label: 'My Dashboard', to: ROLE_HOME.pandit },
      { label: 'Booking Requests', to: '/pandit-dashboard/bookings' },
      { label: 'My Profile', to: '/pandit-dashboard/profile' },
      { label: 'Availability', to: '/pandit-dashboard/availability' },
    ];
  }
  if (role === 'admin') {
    return [
      { label: 'Admin Console', to: ROLE_HOME.admin },
      { label: 'Pandit Applications', to: '/admin/pandits' },
    ];
  }
  return [
    { label: 'My Dashboard', to: ROLE_HOME.customer },
    { label: 'My Bookings', to: '/dashboard/bookings' },
    { label: 'Saved Pandits', to: '/dashboard/saved' },
  ];
}

export function Footer() {
  const { profile } = useAuth();
  const columns = [...linkColumns, { title: 'Account', links: accountLinks(profile?.role) }];
  return (
    <footer className="relative mt-32 bg-charcoal-800 text-cream-200">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/60 via-charcoal-800/95 to-charcoal-900" />
      </div>

      {/* CTA band */}
      <div className="relative section">
        <div className="relative -translate-y-1/2 rounded-3xl surface-dark shadow-luxe px-6 py-8 sm:px-10 sm:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-accent-400/25">
          <div className="relative">
            <p className="eyebrow eyebrow-light mb-2">Begin your ceremony</p>
            <h3 className="font-display text-2xl sm:text-3xl font-semibold text-cream-50 text-balance">Plan an auspicious puja in a few minutes.</h3>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <Link to="/booking" className="btn-accent btn-lg"><Calendar size={16} /> Book a Puja</Link>
            <Link to="/pandits" className="btn-light btn-lg">Explore Pandits</Link>
          </div>
        </div>
      </div>

      <div className="relative section pb-10 -mt-10">
        <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] gap-x-6 gap-y-10">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <span className="w-10 h-10 rounded-xl bg-cream-50/10 flex items-center justify-center">
                <img src="/puja.svg" alt="" className="w-6 h-6" />
              </span>
              <span className="font-display text-2xl font-semibold text-cream-50">PujaNow</span>
            </Link>
            <p className="text-sm text-cream-200/70 leading-relaxed max-w-xs">
              Connecting devotees with verified pandits for authentic Hindu rituals and ceremonies. Bring home the blessings, wherever you are.
            </p>
            <div className="flex gap-2.5 mt-6">
              {[
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Twitter, label: 'Twitter' },
                { Icon: Youtube, label: 'YouTube' },
              ].map(({ Icon, label }) => (
                <a key={label} href="#" aria-label={label} onClick={(e) => e.preventDefault()} className="w-9 h-9 rounded-full border border-cream-50/15 hover:border-accent-400 hover:text-accent-300 hover:-translate-y-0.5 flex items-center justify-center transition-all">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-accent-300 font-semibold mb-4 text-[11px] uppercase tracking-[.2em]">{col.title}</h4>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="group inline-flex items-center gap-1 text-cream-200/80 hover:text-cream-50 transition-colors">
                      {l.label}
                      <ArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 lg:col-span-1">
            <h4 className="text-accent-300 font-semibold mb-4 text-[11px] uppercase tracking-[.2em]">Contact</h4>
            <ul className="space-y-3 text-sm text-cream-200/80">
              <li className="flex items-center gap-2.5"><Phone size={15} className="text-accent-400 shrink-0" /> +91 80456 78900</li>
              <li className="flex items-center gap-2.5"><Mail size={15} className="text-accent-400 shrink-0" /> care@pujanow.in</li>
              <li className="flex items-start gap-2.5"><MapPin size={15} className="text-accent-400 mt-0.5 shrink-0" /> Indiranagar, Bengaluru 560038</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: BadgeCheck, title: 'Verified pandits', desc: 'Profiles reviewed before listing' },
            { icon: ShieldCheck, title: 'Transparent requests', desc: 'Nothing is charged without confirmation' },
            { icon: Headphones, title: 'Real support', desc: 'Talk to our team before your ceremony' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl border border-cream-50/10 bg-cream-50/[.03] px-4 py-3">
              <Icon size={20} className="text-accent-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-cream-50">{title}</p>
                <p className="text-xs text-cream-200/60">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10"><Ornament light /></div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-cream-200/50 text-center">
          <p>© 2026 PujaNow. All rights reserved. Booking and payment status remain pending until confirmed.</p>
          <div className="flex gap-5">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-cream-100">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-cream-100">Terms of Service</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-cream-100">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
