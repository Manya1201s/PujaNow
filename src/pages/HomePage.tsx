import { useState, useEffect, type FormEvent } from 'react';
import { Link, useRouter } from '@/lib/router';
import { fetchPujas, fetchPandits, fetchSamagriProducts, fetchCategories } from '@/lib/data';
import type { Puja, Pandit, SamagriProduct, Category } from '@/types';
import { PujaCard, PanditCard, ProductCard } from '@/components/cards';
import { SectionHeading, Stars, Reveal, Ornament, SkeletonGrid } from '@/components/ui';
import { categoryIcon } from '@/components/categoryIcons';
import { formatINR, formatDuration, cn } from '@/lib/utils';
import {
  Search, Calendar, ShieldCheck, Users, Clock, Heart, ArrowRight, MessageCircle, ShoppingBag,
  BadgeCheck, Quote, Languages, Flower2, ArrowUpRight, Truck, Plus,
} from 'lucide-react';

const HERO_IMAGE = 'https://images.pexels.com/photos/11092914/pexels-photo-11092914.jpeg?auto=compress&cs=tinysrgb&w=1920';

const occasions = ['Griha Pravesh', 'Lakshmi Puja', 'Satyanarayan', 'Rudrabhishek', 'Navagraha'];

export function HomePage() {
  const { navigate } = useRouter();
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [products, setProducts] = useState<SamagriProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([fetchPujas(), fetchPandits(), fetchSamagriProducts(), fetchCategories()])
      .then(([p, pd, pr, c]) => {
        setPujas(p);
        setPandits(pd);
        setProducts(pr);
        setCategories(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const featured = (pujas.some((p) => p.is_featured) ? pujas.filter((p) => p.is_featured) : pujas).slice(0, 6);
  const spotlight = featured[0];
  const heroPuja = featured[1] || featured[0];
  const avgRating = pandits.length ? pandits.reduce((s, p) => s + Number(p.rating), 0) / pandits.length : 0;

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore');
  };

  return (
    <div>
      {/* ───────── HERO ───────── */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-charcoal-900">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover animate-kenburns" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/95 via-primary-900/80 to-primary-900/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-transparent to-charcoal-900/30" />
          <div className="absolute inset-0 bg-rangoli opacity-30" />
        </div>

        <div className="section relative z-10 w-full pt-28 pb-24 lg:pt-32 grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-cream-50/10 backdrop-blur-md border border-accent-300/30 text-cream-100 text-sm animate-fade-in">
              <span className="w-6 h-6 rounded-full bg-accent-400 text-charcoal-900 flex items-center justify-center"><BadgeCheck size={14} /></span>
              500+ verified pandits across India
            </div>
            <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold text-cream-50 mt-6 animate-fade-up text-balance">
              Bring Divine Blessings <span className="italic font-medium text-gradient-gold">Closer to Home.</span>
            </h1>
            <p className="text-cream-100/80 text-base sm:text-lg mt-6 max-w-xl leading-relaxed animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
              PujaNow connects your family with verified pandits for authentic Hindu rituals — from Griha Pravesh to Lakshmi Puja — with samagri and guidance, all in one place.
            </p>

            <div className="flex flex-wrap gap-3 mt-8 animate-fade-up" style={{ animationDelay: '180ms', animationFillMode: 'backwards' }}>
              <Link to="/booking" className="btn-accent btn-lg"><Calendar size={17} /> Book a Puja</Link>
              <Link to="/pandits" className="btn-light btn-lg"><Users size={17} /> Explore Pandits</Link>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-8 max-w-xl bg-cream-50 rounded-2xl sm:rounded-full shadow-luxe p-2 flex flex-col sm:flex-row gap-2 animate-fade-up"
              style={{ animationDelay: '260ms', animationFillMode: 'backwards' }}
            >
              <label className="flex-1 flex items-center gap-3 pl-4">
                <Search size={18} className="text-primary-600 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Which puja are you looking for?"
                  className="w-full py-3 bg-transparent text-charcoal-800 placeholder-charcoal-400 focus:outline-none text-[15px]"
                  aria-label="Search pujas"
                />
              </label>
              <button type="submit" className="btn-primary px-6 py-3">Search</button>
            </form>
            <div className="flex flex-wrap items-center gap-2 mt-4 animate-fade-up" style={{ animationDelay: '320ms', animationFillMode: 'backwards' }}>
              <span className="text-xs text-cream-100/60 mr-1">Popular:</span>
              {occasions.map((o) => (
                <Link key={o} to={`/explore?q=${encodeURIComponent(o)}`} className="text-xs px-3 py-1.5 rounded-full border border-cream-50/20 text-cream-100/85 hover:bg-cream-50/10 hover:border-accent-300/60 transition-colors">
                  {o}
                </Link>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="hidden lg:block relative h-[540px] animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
            <div className="absolute right-6 top-0 w-[360px] h-[500px] arch overflow-hidden border-[6px] border-cream-50/10 shadow-luxe">
              {heroPuja?.image_url ? (
                <img src={heroPuja.image_url.replace('h=650&w=940', 'h=1000&w=720')} alt={heroPuja.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-800/60 bg-rangoli" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary-900/70 via-transparent to-transparent" />
            </div>
            <div className="absolute right-0 top-[-12px] w-[384px] h-[524px] arch border border-accent-300/40 pointer-events-none" />

            {heroPuja && (
              <Link to={`/pujas/${heroPuja.slug}`} className="absolute left-0 bottom-16 w-72 rounded-2xl bg-cream-50/95 backdrop-blur-xl p-4 shadow-elevated border border-cream-50 animate-float hover:shadow-luxe transition-shadow">
                <p className="text-[10px] uppercase tracking-[.2em] text-accent-700 font-semibold">Most loved ceremony</p>
                <p className="font-display text-lg font-semibold text-charcoal-800 mt-1">{heroPuja.name}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-charcoal-500">
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(heroPuja.duration_mins)}</span>
                  <span className="font-display text-base font-semibold text-primary-700">from {formatINR(heroPuja.starting_price)}</span>
                </div>
              </Link>
            )}

            {pandits.length > 0 && (
              <div className="absolute left-12 top-10 rounded-2xl bg-charcoal-900/60 backdrop-blur-xl border border-cream-50/15 p-4 text-cream-50 shadow-elevated animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="flex -space-x-3">
                  {pandits.slice(0, 4).map((p) => (
                    <span key={p.id} className="w-10 h-10 rounded-full border-2 border-accent-300 overflow-hidden bg-cream-200">
                      {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover" />}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-medium mt-3 flex items-center gap-1.5"><ShieldCheck size={15} className="text-accent-300" /> Verified & reviewed</p>
                <p className="text-[11px] text-cream-100/60">Vedic-trained pandits near you</p>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 z-10 border-t border-cream-50/10 bg-charcoal-900/40 backdrop-blur-md">
          <div className="section py-4 grid grid-cols-3 gap-4 text-cream-100/85 text-xs sm:text-sm">
            <span className="flex items-center justify-center sm:justify-start gap-2"><ShieldCheck size={16} className="text-accent-300 shrink-0" /> Verified pandits</span>
            <span className="flex items-center justify-center gap-2"><Clock size={16} className="text-accent-300 shrink-0" /> Same-day booking</span>
            <span className="flex items-center justify-center sm:justify-end gap-2"><Heart size={16} className="text-accent-300 shrink-0" /> <span>10,000+ <span className="hidden sm:inline">rituals performed</span></span></span>
          </div>
        </div>
      </section>

      {/* ───────── MARQUEE ───────── */}
      {pujas.length > 0 && (
        <div className="bg-primary-800 py-4 overflow-hidden border-y border-accent-400/30 mask-fade-x" aria-hidden="true">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[...pujas, ...pujas].map((p, i) => (
              <span key={`${p.id}-${i}`} className="flex items-center gap-6 px-6 font-display text-lg italic text-cream-100/80 whitespace-nowrap">
                {p.name} <span className="w-1.5 h-1.5 rounded-full bg-accent-400/70" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ───────── CATEGORIES ───────── */}
      <section className="section py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="A ritual for every intention"
            title={<>Begin with <span className="italic text-primary-700">what matters</span></>}
            subtitle="Whether you're welcoming prosperity, seeking peace or celebrating a festival, start with the purpose closest to your heart."
            action={<Link to="/explore" className="link-arrow">All ceremonies <ArrowRight size={15} /></Link>}
          />
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {(categories.length ? categories : Array.from({ length: 6 }).map(() => null)).map((c, i) => {
            if (!c) return <div key={i} className="skeleton h-44 rounded-3xl" />;
            const Icon = categoryIcon(c.icon);
            const count = pujas.filter((p) => p.category_id === c.id).length;
            return (
              <Reveal key={c.id} delay={i * 70}>
                <Link
                  to={`/explore?category=${c.slug}`}
                  className="group relative block h-full rounded-3xl border border-cream-300 bg-cream-50 p-5 sm:p-7 overflow-hidden transition-all duration-500 hover:border-primary-700 hover:shadow-luxe"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-rangoli opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                  <div className="absolute -right-6 -bottom-6 text-primary-50 group-hover:text-cream-50/10 transition-colors duration-500">
                    <Icon size={120} strokeWidth={1} />
                  </div>
                  <div className="relative">
                    <span className="flex w-12 h-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 group-hover:bg-accent-400 group-hover:text-charcoal-900 transition-colors duration-500">
                      <Icon size={22} />
                    </span>
                    <h3 className="font-display text-lg sm:text-2xl font-semibold text-charcoal-800 group-hover:text-cream-50 mt-5 transition-colors">{c.name}</h3>
                    <p className="text-xs sm:text-sm text-charcoal-500 group-hover:text-cream-100/75 mt-1.5 line-clamp-2 transition-colors">{c.description}</p>
                    <p className="text-xs font-medium text-primary-700 group-hover:text-accent-300 mt-4 flex items-center gap-1.5 transition-colors">
                      {count} {count === 1 ? 'puja' : 'pujas'} <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────── FEATURED PUJAS ───────── */}
      <section className="relative py-20 lg:py-28 bg-gradient-to-b from-cream-200/60 to-cream-100">
        <div className="absolute inset-0 bg-rangoli-light opacity-70" aria-hidden="true" />
        <div className="section relative">
          <Reveal>
            <SectionHeading
              eyebrow="Most booked"
              title="Featured Pujas"
              subtitle="Authentic ceremonies performed by experienced pandits, with samagri guidance for each."
              action={<Link to="/explore" className="btn-outline">View all pujas <ArrowRight size={15} /></Link>}
            />
          </Reveal>
          {loading ? (
            <SkeletonGrid count={3} kind="puja" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {spotlight && (
                <Reveal className="sm:col-span-2 lg:row-span-2">
                  <Link to={`/pujas/${spotlight.slug}`} className="group relative block h-full min-h-[420px] rounded-3xl overflow-hidden shadow-card hover:shadow-luxe transition-shadow duration-500">
                    {spotlight.image_url && (
                      <img src={spotlight.image_url} alt={spotlight.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-primary-900/40 to-transparent" />
                    <div className="absolute top-5 left-5 flex gap-2">
                      <span className="badge bg-accent-400 text-charcoal-900">Spotlight</span>
                      {spotlight.category && <span className="badge bg-cream-50/15 backdrop-blur text-cream-50 border border-cream-50/20">{spotlight.category.name}</span>}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-6 sm:p-9">
                      <h3 className="font-display text-3xl sm:text-5xl font-semibold text-cream-50">{spotlight.name}</h3>
                      <p className="text-cream-100/80 mt-3 max-w-lg line-clamp-2">{spotlight.short_description || spotlight.description}</p>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
                        <span className="text-cream-50"><span className="text-xs text-cream-100/60 block">Starts at</span><span className="font-display text-2xl font-semibold">{formatINR(spotlight.starting_price)}</span></span>
                        <span className="text-cream-50"><span className="text-xs text-cream-100/60 block">Duration</span><span className="font-display text-2xl font-semibold">{formatDuration(spotlight.duration_mins)}</span></span>
                        <span className="btn-accent ml-auto">View ceremony <ArrowUpRight size={16} /></span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )}
              {featured.slice(1).map((p, i) => <PujaCard key={p.id} puja={p} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="section py-20 lg:py-28">
        <Reveal>
          <SectionHeading eyebrow="Simple process" title="How PujaNow Works" subtitle="From choosing a ceremony to the final aarti — four calm, clear steps." center />
        </Reveal>
        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] border-t-2 border-dashed border-accent-300/70" aria-hidden="true" />
          {[
            { icon: Search, title: 'Select your puja', desc: 'Browse authentic ceremonies by occasion, intention or festival.' },
            { icon: Users, title: 'Choose your pandit', desc: 'Compare verified pandits by experience, language and reviews.' },
            { icon: Calendar, title: 'Pick date & place', desc: 'Choose a time and location, then review your request in full.' },
            { icon: Flower2, title: 'Prepare & celebrate', desc: 'Gather samagri with our checklist and be present for the moment.' },
          ].map((step, i) => (
            <Reveal key={step.title} delay={i * 120} className="relative text-center">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-cream-50 border border-accent-300 shadow-card" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-cream-50">
                  <step.icon size={24} />
                </div>
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-accent-400 text-charcoal-900 text-xs font-bold flex items-center justify-center ring-4 ring-cream-100">{i + 1}</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-charcoal-800 mt-6">{step.title}</h3>
              <p className="text-sm text-charcoal-500 mt-2 leading-relaxed max-w-[240px] mx-auto">{step.desc}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="text-center mt-12">
          <Link to="/booking" className="btn-primary btn-lg">Start planning <ArrowRight size={16} /></Link>
        </Reveal>
      </section>

      {/* ───────── PANDITS ───────── */}
      <section className="relative py-20 lg:py-28 bg-cream-200/50 border-y border-cream-300/70">
        <div className="section">
          <Reveal>
            <SectionHeading
              eyebrow="Trusted & verified"
              title="Meet Our Pandits"
              subtitle="Experienced, Vedic-trained pandits with transparent profiles, languages and verified reviews."
              action={<Link to="/pandits" className="btn-outline">Browse all pandits <ArrowRight size={15} /></Link>}
            />
          </Reveal>
          {loading ? (
            <SkeletonGrid count={4} kind="pandit" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pandits.slice(0, 4).map((p, i) => <PanditCard key={p.id} pandit={p} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ───────── WHY PUJANOW ───────── */}
      <section className="surface-dark py-20 lg:py-28">
        <div className="absolute inset-0 bg-rangoli opacity-40" aria-hidden="true" />
        <div className="section relative grid lg:grid-cols-2 gap-14 items-center">
          <Reveal className="relative order-2 lg:order-1">
            <div className="relative mx-auto max-w-md">
              <div className="aspect-[4/5] arch overflow-hidden border-[6px] border-cream-50/10 shadow-luxe">
                <img
                  src={(pujas[2]?.image_url || HERO_IMAGE).replace('h=650&w=940', 'h=1000&w=800')}
                  alt="A puja ceremony in progress"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -inset-3 arch border border-accent-300/40 pointer-events-none" />
              {avgRating > 0 && (
                <div className="absolute -bottom-6 -right-2 sm:-right-10 rounded-2xl bg-cream-50 text-charcoal-800 p-5 shadow-elevated w-52">
                  <Stars rating={avgRating} size={14} />
                  <p className="font-display text-3xl font-semibold mt-2 text-primary-700">{avgRating.toFixed(1)}<span className="text-base text-charcoal-400">/5</span></p>
                  <p className="text-xs text-charcoal-500">Average rating of pandits listed on PujaNow</p>
                </div>
              )}
              <div className="absolute top-8 -left-2 sm:-left-10 rounded-2xl bg-charcoal-900/70 backdrop-blur-xl border border-cream-50/15 p-4 shadow-elevated">
                <p className="font-display text-2xl font-semibold text-gradient-gold">500+</p>
                <p className="text-[11px] text-cream-100/70">Verified pandits</p>
              </div>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="eyebrow eyebrow-light mb-3">Why choose PujaNow</p>
              <h2 className="font-display text-3xl sm:text-5xl font-semibold text-cream-50 text-balance leading-tight">
                Tradition, kept with <span className="italic text-gradient-gold">care and clarity.</span>
              </h2>
              <p className="text-cream-100/70 mt-5 leading-relaxed max-w-lg">
                From choosing a ceremony to preparing the samagri, PujaNow brings the details together so your family can be present for the moment.
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 gap-4 mt-10">
              {[
                { icon: BadgeCheck, title: 'Verified pandits', desc: 'Profiles include experience, languages, reviews and areas of practice.' },
                { icon: Calendar, title: 'Clear booking steps', desc: 'Review every detail before you submit — nothing is charged up front.' },
                { icon: Languages, title: 'Your language', desc: 'Find pandits who conduct rituals in Hindi, Sanskrit, Tamil, Telugu and more.' },
                { icon: MessageCircle, title: 'Guidance on hand', desc: 'Explore common ritual questions with the clearly labelled demo assistant.' },
              ].map(({ icon: Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className="h-full rounded-2xl bg-cream-50/[.06] border border-cream-50/10 p-5 hover:bg-cream-50/10 hover:border-accent-300/40 transition-all duration-300">
                    <span className="w-10 h-10 rounded-xl bg-accent-400/15 text-accent-300 flex items-center justify-center"><Icon size={19} /></span>
                    <h3 className="font-display text-lg font-semibold text-cream-50 mt-4">{title}</h3>
                    <p className="text-sm text-cream-100/65 mt-1.5 leading-relaxed">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── SAMAGRI ───────── */}
      <section className="section py-20 lg:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Ritual essentials"
            title="The Samagri Store"
            subtitle="Idols, diyas, incense and complete puja kits — everything your ceremony needs, gathered in one place."
            action={<Link to="/samagri" className="link-arrow">Shop all samagri <ArrowRight size={15} /></Link>}
          />
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          <Reveal className="col-span-2 lg:col-span-1">
            <Link to="/samagri" className="group relative flex flex-col justify-end h-full min-h-[260px] rounded-3xl overflow-hidden p-6 surface-dark">
              <div className="absolute inset-0 bg-rangoli opacity-60" />
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent-400/20 blur-2xl" />
              <ShoppingBag className="relative text-accent-300 mb-auto" size={28} />
              <div className="relative">
                <p className="font-display text-2xl font-semibold text-cream-50 leading-snug">Pure, puja-ready essentials</p>
                <ul className="mt-4 space-y-1.5 text-sm text-cream-100/75">
                  <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-accent-300" /> Quality assured</li>
                  <li className="flex items-center gap-2"><Truck size={14} className="text-accent-300" /> Delivered to your door</li>
                </ul>
                <span className="btn-accent mt-6 w-full">Browse store <ArrowRight size={15} /></span>
              </div>
            </Link>
          </Reveal>
          {loading ? (
            <SkeletonGrid count={4} kind="product" className="contents" />
          ) : (
            products.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
          )}
        </div>
      </section>

      {/* ───────── AI ASSISTANT ───────── */}
      <section className="section pb-20 lg:pb-28">
        <div className="relative rounded-[2rem] bg-gradient-to-br from-accent-50 via-cream-50 to-primary-50 border border-accent-200 overflow-hidden">
          <div className="absolute inset-0 bg-rangoli-light" aria-hidden="true" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center p-6 sm:p-10 lg:p-14">
            <Reveal>
              <p className="eyebrow mb-3">AI guidance · demo</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-800 text-balance">Not sure which puja you need?</h2>
              <p className="text-charcoal-500 leading-relaxed mt-4 max-w-lg">
                The PujaNow Assistant helps you discover ceremonies for your occasion, understand rituals and prepare samagri checklists. Responses are pre-written while we finish the real assistant.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {['What puja for a new home?', 'Samagri for Lakshmi Puja', 'Puja for health'].map((q) => (
                  <Link key={q} to="/ai-assistant" className="chip bg-cream-50/80">
                    {q}
                  </Link>
                ))}
              </div>
              <Link to="/ai-assistant" className="btn-primary btn-lg mt-8">
                <MessageCircle size={17} /> Ask the Assistant
              </Link>
            </Reveal>
            <Reveal delay={150}>
              <div className="rounded-3xl bg-cream-50 shadow-luxe border border-cream-300 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-300 bg-cream-100/70">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-accent-200 flex items-center justify-center"><MessageCircle size={16} /></span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal-800">Puja Assistant</p>
                    <p className="text-[11px] text-success-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success-500" /> Demo mode</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex justify-end">
                    <p className="bg-primary-700 text-cream-50 text-sm rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">I'm moving into a new home next month. What puja should I perform?</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><MessageCircle size={13} /></span>
                    <div className="bg-cream-100 border border-cream-300 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-charcoal-700 leading-relaxed">
                        For a new home, <strong>Griha Pravesh Puja</strong> is the most auspicious ceremony. It purifies the space and invites positive energy. You may also consider <strong>Vastu Shanti Puja</strong>.
                      </p>
                      <p className="text-[10px] text-charcoal-400 mt-2 italic">Demo response — not from a real AI model</p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><MessageCircle size={13} /></span>
                    <span className="flex gap-1 bg-cream-100 border border-cream-300 rounded-full px-3 py-2.5">
                      {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="relative py-20 lg:py-28 bg-cream-200/50 border-y border-cream-300/70 overflow-hidden">
        <div className="section">
          <Reveal>
            <SectionHeading eyebrow="Sample testimonials" title="Words from Devotees" subtitle="A preview of the thoughtful experience PujaNow is designed to provide." center />
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Ananya Sharma', city: 'Bengaluru', puja: 'Griha Pravesh Puja', text: 'The pandit was punctual, knowledgeable, and made the entire ceremony feel sacred. Booking was effortless and the reminders were helpful.', rating: 5 },
              { name: 'Rohit Verma', city: 'Delhi', puja: 'Satyanarayan Katha', text: 'Found an excellent pandit through PujaNow. He explained every ritual and its significance. My family was thoroughly impressed.', rating: 5 },
              { name: 'Priya Iyer', city: 'Chennai', puja: 'Lakshmi Puja', text: 'The samagri kit was complete and the pandit was very professional. Made our Diwali puja truly special. Highly recommend!', rating: 4.5 },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <figure className={cn('relative h-full rounded-3xl p-7 border transition-all duration-500 hover:-translate-y-1', i === 1 ? 'surface-dark border-accent-400/30 shadow-luxe' : 'bg-cream-50 border-cream-300 shadow-soft hover:shadow-card')}>
                  <Quote size={36} className={cn('absolute top-6 right-6', i === 1 ? 'text-accent-400/30' : 'text-primary-100')} />
                  <Stars rating={t.rating} size={15} />
                  <blockquote className={cn('mt-5 font-display text-lg leading-relaxed', i === 1 ? 'text-cream-50' : 'text-charcoal-700')}>"{t.text}"</blockquote>
                  <figcaption className={cn('flex items-center gap-3 mt-6 pt-5 border-t', i === 1 ? 'border-cream-50/15' : 'border-cream-300')}>
                    <span className={cn('w-11 h-11 rounded-full flex items-center justify-center font-display text-lg font-semibold', i === 1 ? 'bg-accent-400 text-charcoal-900' : 'bg-primary-100 text-primary-700')}>{t.name[0]}</span>
                    <span>
                      <span className={cn('block text-sm font-semibold', i === 1 ? 'text-cream-50' : 'text-charcoal-800')}>{t.name}</span>
                      <span className={cn('block text-xs', i === 1 ? 'text-cream-100/60' : 'text-charcoal-400')}>{t.city} · {t.puja}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="text-center text-xs text-charcoal-400 mt-8 italic">Sample content shown for demonstration</p>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="section py-20 lg:py-28">
        <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-12">
          <Reveal>
            <p className="eyebrow mb-3">A few answers</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-800">Before you begin</h2>
            <p className="text-charcoal-500 mt-4 leading-relaxed">Need more help? Our team is here to make planning feel simple.</p>
            <Ornament className="mt-6" />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/ai-assistant" className="btn-outline"><MessageCircle size={15} /> Ask the assistant</Link>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <FAQ />
          </Reveal>
        </div>
      </section>
    </div>
  );
}

const faqs: [string, string][] = [
  ['How do I book a puja?', 'Choose a ceremony, select a pandit or request an assignment, then provide your preferred date, time and location. Review the details before submitting your request.'],
  ['Can I choose my own pandit?', 'Yes. Where pandit profiles are available for a ceremony, you can compare their experience, languages, ratings and specializations during booking.'],
  ['Do I need to arrange the samagri?', 'Requirements vary by ceremony. Each puja detail page lists its samagri where available, and you can browse the marketplace for ritual essentials.'],
  ['When is my booking confirmed?', 'Your request appears in your dashboard with its current status. Payment confirmation is not processed by this demo experience.'],
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-3">
      {faqs.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className={cn('rounded-2xl border transition-all duration-300', isOpen ? 'bg-cream-50 border-accent-300 shadow-card' : 'bg-cream-50/50 border-cream-300 hover:border-cream-400')}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-lg font-semibold text-charcoal-800">{q}</span>
              <span className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300', isOpen ? 'bg-primary-700 text-cream-50 rotate-45' : 'bg-cream-200 text-primary-700')}>
                <Plus size={16} />
              </span>
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className="px-5 sm:px-6 pb-5 text-sm text-charcoal-500 leading-relaxed pr-14">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
