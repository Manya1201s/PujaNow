import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/lib/router';
import { fetchPujaBySlug, fetchPanditsForPuja, fetchPujas } from '@/lib/data';
import type { Puja, Pandit } from '@/types';
import { LoadingState, ErrorState, Stars, Breadcrumbs, Reveal, Ornament } from '@/components/ui';
import { PujaCard } from '@/components/cards';
import { formatINR, formatDuration } from '@/lib/utils';
import {
  Clock, Calendar, MapPin, ShoppingBag, Flame, Check, BadgeCheck, ShieldCheck, MessageCircle,
  ArrowRight, Languages, CircleDot,
} from 'lucide-react';

// A general outline most Vedic pujas follow; the pandit adapts it to the specific ceremony.
const typicalFlow = [
  { title: 'Sankalp', desc: 'The family states its intention, names and gotra before the deity.' },
  { title: 'Ganesh Vandana', desc: 'Lord Ganesha is invoked first to remove obstacles from the ritual.' },
  { title: 'Kalash Sthapana & Avahan', desc: 'The sacred kalash is established and the main deity is invited.' },
  { title: 'Main Puja & Mantras', desc: 'Offerings, mantras and katha or path specific to this ceremony.' },
  { title: 'Havan / Aarti', desc: 'Offerings to the sacred fire where applicable, followed by aarti.' },
  { title: 'Prasad & Blessings', desc: 'Prasad is distributed and the family receives blessings.' },
];

export function PujaDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const [puja, setPuja] = useState<Puja | null>(null);
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [related, setRelated] = useState<Puja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchPujaBySlug(slug)
      .then((p) => {
        if (!p) { setError('Puja not found'); return; }
        setPuja(p);
        fetchPanditsForPuja(p.id).then(setPandits).catch(() => {});
        fetchPujas()
          .then((all) => {
            const others = all.filter((x) => x.id !== p.id);
            const sameCategory = others.filter((x) => x.category_id && x.category_id === p.category_id);
            setRelated([...sameCategory, ...others.filter((x) => !sameCategory.includes(x))].slice(0, 3));
          })
          .catch(() => {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="pt-24"><LoadingState label="Loading puja details..." /></div>;
  if (error || !puja) return <div className="pt-24"><ErrorState message={error || 'Puja not found'} onRetry={() => navigate('/explore')} /></div>;

  const bookUrl = `/booking?puja=${puja.slug}`;
  const largeImage = puja.image_url?.replace('h=650&w=940', 'h=1080&w=1920');

  return (
    <div className="pb-24 lg:pb-0">
      {/* Hero */}
      <section className="relative min-h-[62vh] lg:min-h-[70vh] flex items-end overflow-hidden bg-charcoal-900">
        {largeImage && <img src={largeImage} alt={puja.name} className="absolute inset-0 w-full h-full object-cover animate-kenburns" />}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/50 to-charcoal-900/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/60 to-transparent" />
        <div className="section relative w-full pt-28 pb-12 lg:pb-16">
          <Breadcrumbs light items={[{ label: 'Home', to: '/' }, { label: 'Pujas', to: '/explore' }, ...(puja.category ? [{ label: puja.category.name, to: `/explore?category=${puja.category.slug}` }] : []), { label: puja.name }]} />
          <div className="max-w-3xl mt-6 animate-fade-up">
            {puja.category && <span className="badge bg-accent-400 text-charcoal-900 mb-4">{puja.category.name}</span>}
            <h1 className="font-display text-4xl sm:text-6xl font-semibold text-cream-50 text-balance">{puja.name}</h1>
            <p className="text-cream-100/80 text-lg mt-4 max-w-2xl">{puja.short_description || puja.description}</p>
            <div className="flex flex-wrap gap-3 mt-7">
              {[
                { icon: Clock, label: formatDuration(puja.duration_mins) },
                { icon: Flame, label: `${puja.popularity} bookings` },
                { icon: BadgeCheck, label: `${pandits.length || 'Verified'} pandit${pandits.length === 1 ? '' : 's'}` },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2 text-sm text-cream-50 bg-cream-50/10 backdrop-blur-md border border-cream-50/15 rounded-full px-4 py-2">
                  <Icon size={15} className="text-accent-300" /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="section py-12 lg:py-16 grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-start">
        <div className="min-w-0 space-y-14">
          {/* About */}
          <Reveal>
            <p className="eyebrow mb-3">Significance</p>
            <h2 className="font-display text-3xl font-semibold text-charcoal-800">About this puja</h2>
            <p className="text-charcoal-600 leading-[1.85] mt-5 text-[17px] first-letter:font-display first-letter:text-5xl first-letter:font-semibold first-letter:text-primary-700 first-letter:float-left first-letter:mr-2 first-letter:leading-[.9]">
              {puja.description}
            </p>
          </Reveal>

          {/* Benefits */}
          {puja.benefits && puja.benefits.length > 0 && (
            <Reveal>
              <p className="eyebrow mb-3">Blessings sought</p>
              <h2 className="font-display text-3xl font-semibold text-charcoal-800">Benefits of this puja</h2>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {puja.benefits.map((b, i) => (
                  <div key={b} className="flex items-start gap-3 p-4 rounded-2xl bg-cream-50 border border-cream-300 hover:border-accent-300 hover:shadow-soft transition-all">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-200 to-accent-400 text-charcoal-900 flex items-center justify-center shrink-0 font-display text-sm font-semibold">{i + 1}</span>
                    <span className="text-sm text-charcoal-700 leading-relaxed pt-1">{b}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Ritual flow */}
          <Reveal>
            <p className="eyebrow mb-3">Ritual process</p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-3xl font-semibold text-charcoal-800">How the ceremony unfolds</h2>
              <span className="badge bg-primary-50 text-primary-700 border border-primary-100"><Clock size={12} /> About {formatDuration(puja.duration_mins)}</span>
            </div>
            <p className="text-sm text-charcoal-500 mt-2">A typical sequence — your pandit will tailor the rituals to this puja and your family's traditions.</p>
            <ol className="relative mt-7 ml-4 border-l-2 border-dashed border-accent-300/80 space-y-6">
              {typicalFlow.map((s, i) => (
                <li key={s.title} className="relative pl-8">
                  <span className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full bg-cream-50 border-2 border-primary-600 flex items-center justify-center">
                    {i === typicalFlow.length - 1 ? <Check size={11} className="text-primary-600" /> : <CircleDot size={11} className="text-primary-600" />}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-charcoal-800">{s.title}</h3>
                  <p className="text-sm text-charcoal-500 mt-0.5">{s.desc}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          {/* Samagri */}
          {puja.samagri_items && puja.samagri_items.length > 0 && (
            <Reveal>
              <div className="rounded-3xl bg-gradient-to-br from-accent-50 to-cream-50 border border-accent-200 p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-rangoli-light" aria-hidden="true" />
                <div className="relative">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow mb-3">Preparation</p>
                      <h2 className="font-display text-3xl font-semibold text-charcoal-800">Samagri required</h2>
                      <p className="text-sm text-charcoal-500 mt-1">{puja.samagri_items.length} items to gather before the ceremony</p>
                    </div>
                    <Link to="/samagri" className="btn-primary"><ShoppingBag size={15} /> Shop samagri</Link>
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-6">
                    {puja.samagri_items.map((s) => (
                      <li key={s} className="flex items-center gap-2.5 text-sm text-charcoal-700">
                        <span className="w-5 h-5 rounded-md bg-cream-50 border border-accent-300 flex items-center justify-center shrink-0"><Check size={12} className="text-primary-700" /></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          )}

          {/* Pandits */}
          <Reveal>
            <p className="eyebrow mb-3">Performed by</p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-3xl font-semibold text-charcoal-800">Available pandits</h2>
              <Link to="/pandits" className="link-arrow">All pandits <ArrowRight size={14} /></Link>
            </div>
            {pandits.length === 0 ? (
              <div className="mt-6 p-6 rounded-2xl border border-dashed border-cream-400 text-center">
                <p className="text-sm text-charcoal-500">No pandits are listed for this puja yet. When you book, we'll assign a verified pandit for you.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {pandits.map((p) => (
                  <Link key={p.id} to={`/pandits/${p.id}`} className="card-hover p-4 flex items-center gap-4 group">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-cream-200 ring-2 ring-accent-300 ring-offset-2 ring-offset-cream-50">
                        {p.photo_url && <img src={p.photo_url} alt={p.display_name} loading="lazy" className="w-full h-full object-cover" />}
                      </div>
                      {p.verification_status === 'verified' && <BadgeCheck size={18} className="absolute -bottom-1 -right-1 text-success-600 fill-cream-50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-lg font-semibold text-charcoal-800 truncate group-hover:text-primary-700">{p.display_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Stars rating={p.rating} size={12} />
                        <span className="text-xs text-charcoal-500">{p.rating} · {p.experience_years} yrs</span>
                      </div>
                      <p className="text-xs text-charcoal-400 mt-1 flex items-center gap-1 truncate"><MapPin size={11} /> {p.location} <span className="mx-1">·</span> <Languages size={11} /> {p.languages[0]}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary-700 shrink-0">{formatINR(p.base_price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Reveal>
        </div>

        {/* Booking card */}
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-3xl bg-cream-50 border border-cream-300 shadow-luxe overflow-hidden">
            <div className="surface-dark px-6 py-6">
              <div className="absolute inset-0 bg-rangoli opacity-50" />
              <p className="relative text-xs uppercase tracking-[.2em] text-accent-200">Starts at</p>
              <p className="relative font-display text-4xl font-semibold text-cream-50 mt-1">{formatINR(puja.starting_price)}</p>
              <p className="relative text-xs text-cream-100/60 mt-1">Final dakshina varies by pandit and location</p>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm text-charcoal-600">
                <li className="flex items-center gap-3"><Clock size={16} className="text-primary-600" /> About {formatDuration(puja.duration_mins)} ceremony</li>
                <li className="flex items-center gap-3"><BadgeCheck size={16} className="text-primary-600" /> Verified, experienced pandits</li>
                <li className="flex items-center gap-3"><ShieldCheck size={16} className="text-primary-600" /> No payment taken until confirmed</li>
              </ul>
              <Link to={bookUrl} className="btn-primary btn-lg w-full mt-6"><Calendar size={16} /> Book this puja</Link>
              <Link to="/ai-assistant" className="btn-ghost w-full mt-2"><MessageCircle size={15} /> Have a question? Ask</Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-cream-200/50 border-t border-cream-300/70 py-16 lg:py-20">
          <div className="section">
            <div className="flex flex-col items-center text-center mb-10">
              <p className="eyebrow mb-3">You may also consider</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-800">Related pujas</h2>
              <Ornament className="mt-4" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p, i) => <PujaCard key={p.id} puja={p} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* Mobile booking bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream-50/95 backdrop-blur-xl border-t border-cream-300 px-4 py-3 flex items-center gap-4 shadow-[0_-8px_30px_-12px_rgba(37,32,30,.25)]">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-charcoal-400">Starts at</p>
          <p className="font-display text-xl font-semibold text-primary-700 leading-tight">{formatINR(puja.starting_price)}</p>
        </div>
        <Link to={bookUrl} className="btn-primary px-6 py-3"><Calendar size={15} /> Book now</Link>
      </div>
    </div>
  );
}
