import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/lib/router';
import { fetchPanditById, fetchReviewsForPandit } from '@/lib/data';
import { useToast } from '@/lib/toast';
import type { Pandit, Review } from '@/types';
import { LoadingState, ErrorState, Stars, EmptyState, Breadcrumbs, Reveal } from '@/components/ui';
import { SavePanditButton } from '@/components/cards';
import { formatINR, formatDate, formatRating, displayCase, cn } from '@/lib/utils';
import {
  MapPin, Languages, BadgeCheck, Calendar, Award, Users, Star, Navigation, Share2, ArrowUpRight,
  ShieldCheck, Clock, MessageSquareQuote,
} from 'lucide-react';

export function PanditDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { show } = useToast();
  const [pandit, setPandit] = useState<Pandit | null>(null);
  const [reviews, setReviews] = useState<(Review & { customer_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchPanditById(id)
      .then((p) => {
        if (!p) { setError('Pandit not found'); return; }
        setPandit(p);
        fetchReviewsForPandit(p.id).then(setReviews).catch(() => {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="pt-24"><LoadingState label="Loading pandit profile…" /></div>;
  if (error || !pandit) return <div className="pt-24"><ErrorState message={error || 'Pandit not found'} onRetry={() => navigate('/pandits')} /></div>;

  const bookUrl = `/booking?pandit=${pandit.id}`;
  const hasReviews = pandit.total_reviews > 0;
  const city = displayCase(pandit.location);
  const verified = pandit.verification_status === 'verified';
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${pandit.display_name} on PujaNow`, url });
      } else {
        await navigator.clipboard.writeText(url);
        show('Profile link copied', 'success');
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="pb-24 lg:pb-0">
      {/* Cover */}
      <section className="surface-dark h-72">
        <div className="absolute -right-20 -bottom-40 w-96 h-96 rounded-full border border-accent-400/20 animate-spin-slow">
          <div className="absolute inset-10 rounded-full border border-dashed border-accent-400/25" />
        </div>
        <div className="section relative pt-24 lg:pt-28">
          <Breadcrumbs light items={[{ label: 'Home', to: '/' }, { label: 'Pandits', to: '/pandits' }, { label: pandit.display_name }]} />
        </div>
      </section>

      <div className="section">
        {/* Profile header */}
        <div className="relative -mt-28 sm:-mt-24 rounded-3xl bg-cream-50 border border-cream-300 shadow-luxe p-6 sm:p-8 animate-fade-up">
          <div className="flex flex-col md:flex-row gap-6 md:items-end">
            <div className="relative shrink-0 -mt-20 md:-mt-24 mx-auto md:mx-0">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-br from-accent-200 via-accent-500 to-primary-700 shadow-luxe">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-cream-50 bg-cream-200">
                  {pandit.photo_url ? (
                    <img src={pandit.photo_url} alt={pandit.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-display text-5xl text-primary-400">{pandit.display_name[0]}</span>
                  )}
                </div>
              </div>
              {pandit.is_available && (
                <span className="absolute bottom-3 right-3 badge bg-success-600 text-white ring-4 ring-cream-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Available
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-800 break-words">{pandit.display_name}</h1>
                {verified && (
                  <span className="badge bg-success-50 text-success-700 border border-success-200"><BadgeCheck size={13} /> Verified</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 mt-3 text-sm text-charcoal-500">
                {hasReviews ? (
                  <span className="flex items-center gap-1.5"><Stars rating={pandit.rating} size={14} /> <b className="text-charcoal-800">{formatRating(pandit.rating)}</b> ({pandit.total_reviews} {pandit.total_reviews === 1 ? 'review' : 'reviews'})</span>
                ) : (
                  <span className="font-medium text-accent-700">New on PujaNow</span>
                )}
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary-600" /> {city}</span>
                <span className="flex items-center gap-1.5"><Languages size={14} className="text-primary-600" /> {pandit.languages.join(', ')}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 shrink-0">
              <SavePanditButton panditId={pandit.id} withLabel />
              <button onClick={share} className="btn-outline px-3.5" aria-label="Share profile"><Share2 size={16} /></button>
              <Link to={bookUrl} className="btn-primary hidden sm:inline-flex"><Calendar size={16} /> Book Now</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { icon: Award, value: `${pandit.experience_years}+`, label: 'Years experience' },
              { icon: Users, value: pandit.total_bookings, label: 'Ceremonies booked' },
              { icon: Star, value: hasReviews ? formatRating(pandit.rating) : 'New', label: 'Average rating' },
              { icon: Navigation, value: `${pandit.service_radius_km} km`, label: 'Service radius' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-2xl bg-cream-100 border border-cream-300/80 p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><Icon size={18} /></span>
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold text-charcoal-800 leading-tight">{value}</p>
                  <p className="text-[11px] text-charcoal-500 uppercase tracking-wide leading-snug">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 mt-12 items-start">
          <div className="min-w-0 space-y-12">
            <Reveal>
              <p className="eyebrow mb-3">About</p>
              <h2 className="font-display text-3xl font-semibold text-charcoal-800">Meet {pandit.display_name.split(' ').slice(0, 2).join(' ')}</h2>
              <p className="text-charcoal-600 leading-[1.85] mt-4 text-[16px]">{pandit.bio || 'This pandit has not added a biography yet.'}</p>
            </Reveal>

            <Reveal>
              <p className="eyebrow mb-3">Services offered</p>
              <h2 className="font-display text-3xl font-semibold text-charcoal-800">Specializations</h2>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {pandit.specializations.map((s) => (
                  <Link key={s} to={`/explore?q=${encodeURIComponent(s.split(' ')[0])}`} className="group flex items-center justify-between gap-3 p-4 rounded-2xl bg-cream-50 border border-cream-300 hover:border-primary-300 hover:shadow-card transition-all">
                    <span className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-accent-400 group-hover:scale-150 transition-transform" />
                      <span className="text-sm font-medium text-charcoal-700">{s}</span>
                    </span>
                    <ArrowUpRight size={15} className="text-charcoal-300 group-hover:text-primary-700 transition-colors" />
                  </Link>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-cream-50 border border-cream-300 p-5">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Languages size={18} className="text-primary-600" /> Languages</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {pandit.languages.map((l) => <span key={l} className="chip text-xs cursor-default hover:border-cream-400 hover:text-charcoal-600">{l}</span>)}
                  </div>
                </div>
                <div className="rounded-2xl bg-cream-50 border border-cream-300 p-5">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Clock size={18} className="text-primary-600" /> Availability</h3>
                  <p className={cn('mt-4 text-sm font-medium flex items-center gap-2', pandit.is_available ? 'text-success-700' : 'text-charcoal-500')}>
                    <span className={cn('w-2 h-2 rounded-full', pandit.is_available ? 'bg-success-500' : 'bg-charcoal-300')} />
                    {pandit.is_available ? 'Accepting new bookings' : 'Not accepting bookings right now'}
                  </p>
                  <p className="text-sm text-charcoal-500 mt-2">Serves within {pandit.service_radius_km} km of {city}.</p>
                </div>
              </div>
            </Reveal>

            {/* Reviews */}
            <Reveal>
              <p className="eyebrow mb-3">Devotee feedback</p>
              <h2 className="font-display text-3xl font-semibold text-charcoal-800">Ratings & reviews</h2>
              <div className="grid sm:grid-cols-[200px_1fr] gap-6 mt-6 p-6 rounded-3xl bg-cream-50 border border-cream-300">
                <div className="text-center sm:border-r border-cream-300 sm:pr-6">
                  <p className="font-display text-6xl font-semibold text-primary-700">{hasReviews ? formatRating(pandit.rating) : '–'}</p>
                  <div className="flex justify-center mt-2"><Stars rating={pandit.rating} size={18} /></div>
                  <p className="text-xs text-charcoal-500 mt-2">{hasReviews ? `${pandit.total_reviews} ${pandit.total_reviews === 1 ? 'rating' : 'ratings'} overall` : 'No ratings yet'}</p>
                </div>
                <div className="space-y-2 self-center">
                  {breakdown.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-3 text-xs text-charcoal-500">
                      <span className="w-8 flex items-center gap-0.5">{star} <Star size={11} className="fill-accent-400 text-accent-400" /></span>
                      <span className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                        <span className="block h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600" style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }} />
                      </span>
                      <span className="w-6 text-right">{count}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-charcoal-400 pt-1">Breakdown of {reviews.length} published review{reviews.length === 1 ? '' : 's'}</p>
                </div>
              </div>

              {reviews.length === 0 ? (
                <EmptyState icon={<MessageSquareQuote size={30} />} title="No written reviews yet" description="Reviews appear here after completed bookings." />
              ) : (
                <div className="grid gap-4 mt-6">
                  {reviews.map((r) => (
                    <figure key={r.id} className="p-5 rounded-2xl bg-cream-50 border border-cream-300">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-display font-semibold">
                          {r.customer_name?.[0] || 'A'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-charcoal-800">{r.customer_name || 'Anonymous'}</p>
                          <p className="text-xs text-charcoal-400">{formatDate(r.created_at)}</p>
                        </div>
                        <Stars rating={r.rating} size={13} />
                      </div>
                      {r.comment && <blockquote className="text-sm text-charcoal-600 leading-relaxed mt-3">{r.comment}</blockquote>}
                    </figure>
                  ))}
                </div>
              )}
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-28">
            <div className="rounded-3xl bg-cream-50 border border-cream-300 shadow-luxe overflow-hidden">
              <div className="surface-dark p-6">
                <p className="relative text-xs uppercase tracking-[.2em] text-accent-200">Dakshina from</p>
                <p className="relative font-display text-4xl font-semibold text-cream-50 mt-1">{formatINR(pandit.base_price)}</p>
                <p className="relative text-xs text-cream-100/60 mt-1">Final amount depends on the puja chosen</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3 text-sm text-charcoal-600">
                  {verified && <li className="flex items-center gap-3"><BadgeCheck size={16} className="text-primary-600" /> Identity & credentials verified</li>}
                  <li className="flex items-center gap-3"><MapPin size={16} className="text-primary-600" /> Comes to your home in {city.split(',')[0]}</li>
                  <li className="flex items-center gap-3"><ShieldCheck size={16} className="text-primary-600" /> No payment taken until confirmed</li>
                </ul>
                <Link to={bookUrl} className="btn-primary btn-lg w-full mt-6"><Calendar size={16} /> Book Now</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream-50/95 backdrop-blur-xl border-t border-cream-300 px-4 py-3 flex items-center gap-4 shadow-[0_-8px_30px_-12px_rgba(37,32,30,.25)]">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-charcoal-400">Dakshina from</p>
          <p className="font-display text-xl font-semibold text-primary-700 leading-tight">{formatINR(pandit.base_price)}</p>
        </div>
        <Link to={bookUrl} className="btn-primary px-6 py-3"><Calendar size={15} /> Book Now</Link>
      </div>
    </div>
  );
}
