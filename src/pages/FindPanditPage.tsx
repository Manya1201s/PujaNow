import { useState, useEffect, useMemo } from 'react';
import { fetchPandits } from '@/lib/data';
import type { Pandit } from '@/types';
import { PanditCard } from '@/components/cards';
import { EmptyState, PageHero, SkeletonGrid, Drawer, FilterGroup, RadioRow } from '@/components/ui';
import { getQueryParam } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Search, MapPin, X, SlidersHorizontal, Users, Star } from 'lucide-react';

type Sort = 'rating' | 'experience' | 'price_low' | 'bookings';

const experienceOptions = [
  { value: 0, label: 'Any experience' },
  { value: 5, label: '5+ years' },
  { value: 10, label: '10+ years' },
  { value: 20, label: '20+ years' },
];

const ratingOptions = [
  { value: 0, label: 'Any rating' },
  { value: 4, label: '4.0 & above' },
  { value: 4.5, label: '4.5 & above' },
];

export function FindPanditPage() {
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => getQueryParam('q'));
  const [location, setLocation] = useState(() => getQueryParam('location'));
  const [specialization, setSpecialization] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [languages, setLanguages] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('rating');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPandits()
      .then(setPandits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allSpecializations = useMemo(() => [...new Set(pandits.flatMap((p) => p.specializations))].sort(), [pandits]);
  const allLanguages = useMemo(() => [...new Set(pandits.flatMap((p) => p.languages))].sort(), [pandits]);
  const allCities = useMemo(() => [...new Set(pandits.map((p) => p.location.split(',')[0].trim()))].sort(), [pandits]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const list = pandits.filter(
      (p) =>
        (!s || p.display_name.toLowerCase().includes(s) || p.specializations.some((sp) => sp.toLowerCase().includes(s))) &&
        (!loc || p.location.toLowerCase().includes(loc)) &&
        (!specialization || p.specializations.includes(specialization)) &&
        p.experience_years >= minExperience &&
        Number(p.rating) >= minRating &&
        (languages.length === 0 || languages.some((l) => p.languages.includes(l))) &&
        (!availableOnly || p.is_available),
    );
    const sorters: Record<Sort, (a: Pandit, b: Pandit) => number> = {
      rating: (a, b) => b.rating - a.rating,
      experience: (a, b) => b.experience_years - a.experience_years,
      price_low: (a, b) => a.base_price - b.base_price,
      bookings: (a, b) => b.total_bookings - a.total_bookings,
    };
    return [...list].sort(sorters[sort]);
  }, [pandits, search, location, specialization, minExperience, minRating, languages, availableOnly, sort]);

  const toggleLanguage = (l: string) => setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const activeCount = [specialization, minExperience, minRating, languages.length, availableOnly].filter(Boolean).length;
  const clearAll = () => {
    setSearch(''); setLocation(''); setSpecialization(''); setMinExperience(0); setMinRating(0); setLanguages([]); setAvailableOnly(false);
  };

  const filterPanel = (
    <>
      <FilterGroup title="Availability">
        <button
          type="button"
          onClick={() => setAvailableOnly((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-cream-200/70 text-sm text-charcoal-600"
          role="switch"
          aria-checked={availableOnly}
        >
          Available now only
          <span className={cn('w-10 h-6 rounded-full p-0.5 transition-colors', availableOnly ? 'bg-primary-600' : 'bg-cream-400')}>
            <span className={cn('block w-5 h-5 rounded-full bg-white shadow transition-transform', availableOnly && 'translate-x-4')} />
          </span>
        </button>
      </FilterGroup>
      <FilterGroup title="Rating">
        <div className="flex flex-col gap-0.5">
          {ratingOptions.map((o) => (
            <RadioRow key={o.value} checked={minRating === o.value} onClick={() => setMinRating(o.value)}>
              {o.value > 0 && <Star size={13} className="fill-accent-400 text-accent-400" />} {o.label}
            </RadioRow>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Experience">
        <div className="flex flex-col gap-0.5">
          {experienceOptions.map((o) => <RadioRow key={o.value} checked={minExperience === o.value} onClick={() => setMinExperience(o.value)}>{o.label}</RadioRow>)}
        </div>
      </FilterGroup>
      {allLanguages.length > 0 && (
        <FilterGroup title="Languages">
          <div className="flex flex-wrap gap-2">
            {allLanguages.map((l) => (
              <button key={l} onClick={() => toggleLanguage(l)} className={cn('chip text-xs px-3 py-1', languages.includes(l) && 'chip-active')}>{l}</button>
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title="Specialization">
        <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
          <RadioRow checked={!specialization} onClick={() => setSpecialization('')}>All specializations</RadioRow>
          {allSpecializations.map((s) => <RadioRow key={s} checked={specialization === s} onClick={() => setSpecialization(s)}>{s}</RadioRow>)}
        </div>
      </FilterGroup>
    </>
  );

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Verified & reviewed"
        title="Find Your Pandit"
        subtitle="Compare experienced, Vedic-trained pandits by specialization, language, rating and city."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Find a Pandit' }]}
      >
        <div className="max-w-3xl bg-cream-50 rounded-3xl sm:rounded-full shadow-luxe p-1.5 flex flex-col sm:flex-row gap-1.5">
          <label className="flex-1 flex items-center gap-3 px-4">
            <Search size={18} className="text-primary-600 shrink-0" />
            <input
              type="text"
              placeholder="Name or ritual, e.g. ‘Rudrabhishek’"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-3 bg-transparent text-charcoal-800 placeholder-charcoal-400 focus:outline-none text-[15px]"
              aria-label="Search pandits"
            />
          </label>
          <span className="hidden sm:block w-px bg-cream-300 my-2" />
          <label className="sm:w-56 flex items-center gap-3 px-4 border-t sm:border-0 border-cream-200">
            <MapPin size={18} className="text-primary-600 shrink-0" />
            <input
              type="text"
              list="pandit-cities"
              placeholder="City"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full py-3 bg-transparent text-charcoal-800 placeholder-charcoal-400 focus:outline-none text-[15px]"
              aria-label="City"
            />
            <datalist id="pandit-cities">{allCities.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
        </div>
        {allCities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-cream-100/60">Cities:</span>
            {allCities.map((c) => (
              <button
                key={c}
                onClick={() => setLocation(location === c ? '' : c)}
                className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors', location === c ? 'bg-accent-400 border-accent-400 text-charcoal-900' : 'border-cream-50/20 text-cream-100/85 hover:bg-cream-50/10')}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </PageHero>

      <div className="section py-8 lg:py-10">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28 card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">Refine</h3>
                {(activeCount > 0 || search || location) && <button onClick={clearAll} className="text-xs font-medium text-primary-700 hover:underline">Clear all</button>}
              </div>
              {filterPanel}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <p className="text-sm text-charcoal-500">
                {loading ? 'Finding pandits…' : <><span className="font-semibold text-charcoal-800">{filtered.length}</span> verified pandit{filtered.length !== 1 ? 's' : ''}</>}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(true)} className="lg:hidden chip">
                  <SlidersHorizontal size={14} /> Filters {activeCount > 0 && <span className="badge bg-primary-700 text-cream-50 px-1.5">{activeCount}</span>}
                </button>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="pl-3 pr-8 py-2 rounded-full border border-cream-400 bg-cream-50 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  aria-label="Sort pandits"
                >
                  <option value="rating">Top rated</option>
                  <option value="experience">Most experienced</option>
                  <option value="bookings">Most booked</option>
                  <option value="price_low">Dakshina: low to high</option>
                </select>
              </div>
            </div>

            {loading ? (
              <SkeletonGrid count={6} kind="pandit" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" />
            ) : filtered.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Users size={32} />}
                  title="No pandits match your search"
                  description="Try another city, broaden your filters or search by a different ritual."
                  action={<button onClick={clearAll} className="btn-primary">Clear filters</button>}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((p, i) => <PanditCard key={p.id} pandit={p} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter pandits"
        footer={
          <div className="flex gap-3">
            <button onClick={clearAll} className="btn-outline flex-1"><X size={15} /> Clear</button>
            <button onClick={() => setShowFilters(false)} className="btn-primary flex-1">Show {filtered.length}</button>
          </div>
        }
      >
        {filterPanel}
      </Drawer>
    </div>
  );
}
