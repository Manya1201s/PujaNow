import { useState, useEffect, useMemo } from 'react';
import { fetchPujas, fetchCategories } from '@/lib/data';
import type { Puja, Category } from '@/types';
import { PujaCard } from '@/components/cards';
import { EmptyState, PageHero, SkeletonGrid, Drawer, FilterGroup, RadioRow } from '@/components/ui';
import { useDebounced, getQueryParam } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, X, Flower2 } from 'lucide-react';

type Sort = 'popularity' | 'price_low' | 'price_high';

const priceRanges = [
  { id: '', label: 'Any budget', min: 0, max: Infinity },
  { id: 'u2', label: 'Under ₹2,000', min: 0, max: 1999 },
  { id: '2-5', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { id: '5-10', label: '₹5,000 – ₹10,000', min: 5001, max: 10000 },
  { id: '10+', label: 'Above ₹10,000', min: 10001, max: Infinity },
];

const durations = [
  { id: '', label: 'Any duration', min: 0, max: Infinity },
  { id: 'le1', label: 'Up to 1 hour', min: 0, max: 60 },
  { id: '1-2', label: '1 – 2 hours', min: 61, max: 120 },
  { id: '2-3', label: '2 – 3 hours', min: 121, max: 180 },
  { id: '3+', label: 'More than 3 hours', min: 181, max: Infinity },
];

export function ExplorePujasPage() {
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => getQueryParam('q'));
  const [category, setCategory] = useState(() => getQueryParam('category'));
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [sort, setSort] = useState<Sort>('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounced(search.trim(), 300);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPujas({ search: debouncedSearch || undefined, sort })
      .then((data) => { if (active) setPujas(data); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedSearch, sort]);

  const filtered = useMemo(() => {
    const pr = priceRanges.find((r) => r.id === price) || priceRanges[0];
    const du = durations.find((d) => d.id === duration) || durations[0];
    return pujas.filter(
      (p) =>
        (!category || p.category?.slug === category) &&
        p.starting_price >= pr.min && p.starting_price <= pr.max &&
        p.duration_mins >= du.min && p.duration_mins <= du.max,
    );
  }, [pujas, category, price, duration]);

  const activeFilters = [
    category && { key: 'category', label: categories.find((c) => c.slug === category)?.name || category, clear: () => setCategory('') },
    price && { key: 'price', label: priceRanges.find((r) => r.id === price)?.label || '', clear: () => setPrice('') },
    duration && { key: 'duration', label: durations.find((d) => d.id === duration)?.label || '', clear: () => setDuration('') },
    search.trim() && { key: 'search', label: `“${search.trim()}”`, clear: () => setSearch('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const clearAll = () => { setCategory(''); setPrice(''); setDuration(''); setSearch(''); };

  const filterPanel = (
    <>
      <FilterGroup title="Intention">
        <div className="flex flex-col gap-0.5">
          <RadioRow checked={!category} onClick={() => setCategory('')}>All categories</RadioRow>
          {categories.map((c) => (
            <RadioRow key={c.id} checked={category === c.slug} onClick={() => setCategory(c.slug)}>
              <span className="flex-1">{c.name}</span>
              <span className="text-[11px] text-charcoal-400">{pujas.filter((p) => p.category?.slug === c.slug).length}</span>
            </RadioRow>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Budget">
        <div className="flex flex-col gap-0.5">
          {priceRanges.map((r) => <RadioRow key={r.id} checked={price === r.id} onClick={() => setPrice(r.id)}>{r.label}</RadioRow>)}
        </div>
      </FilterGroup>
      <FilterGroup title="Duration">
        <div className="flex flex-col gap-0.5">
          {durations.map((d) => <RadioRow key={d.id} checked={duration === d.id} onClick={() => setDuration(d.id)}>{d.label}</RadioRow>)}
        </div>
      </FilterGroup>
    </>
  );

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="The ceremony catalogue"
        title="Explore Pujas"
        subtitle="Discover authentic ceremonies for every occasion and purpose, each performed by verified, experienced pandits."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Explore Pujas' }]}
        image={pujas[0]?.image_url || undefined}
      >
        <div className="max-w-2xl bg-cream-50 rounded-full shadow-luxe p-1.5 flex items-center gap-2">
          <Search size={18} className="text-primary-600 ml-4 shrink-0" />
          <input
            type="text"
            placeholder="Search by name or purpose, e.g. ‘prosperity’"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 py-3 bg-transparent text-charcoal-800 placeholder-charcoal-400 focus:outline-none text-[15px]"
            aria-label="Search pujas"
          />
          {search && (
            <button onClick={() => setSearch('')} className="icon-btn w-9 h-9 text-charcoal-400" aria-label="Clear search"><X size={16} /></button>
          )}
        </div>
      </PageHero>

      {/* Category chips */}
      <div className="sticky top-16 lg:top-20 z-30 bg-cream-100/90 backdrop-blur-xl border-b border-cream-300/70">
        <div className="section py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto scrollbar-hide mask-fade-edges -mx-4 px-4 py-0.5">
            <button onClick={() => setCategory('')} className={cn('chip', !category && 'chip-active')}>All</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.slug)} className={cn('chip', category === c.slug && 'chip-active')}>{c.name}</button>
            ))}
          </div>
          <button onClick={() => setShowFilters(true)} className="lg:hidden chip shrink-0">
            <SlidersHorizontal size={14} /> Filters
            {(price || duration) && <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
          </button>
        </div>
      </div>

      <div className="section py-8 lg:py-10">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-40 card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">Refine</h3>
                {activeFilters.length > 0 && <button onClick={clearAll} className="text-xs font-medium text-primary-700 hover:underline">Clear all</button>}
              </div>
              {filterPanel}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-sm text-charcoal-500">
                {loading ? 'Finding ceremonies…' : <><span className="font-semibold text-charcoal-800">{filtered.length}</span> puja{filtered.length !== 1 ? 's' : ''} found</>}
              </p>
              <label className="flex items-center gap-2 text-sm text-charcoal-500">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="pl-3 pr-8 py-2 rounded-full border border-cream-400 bg-cream-50 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="popularity">Most popular</option>
                  <option value="price_low">Price: low to high</option>
                  <option value="price_high">Price: high to low</option>
                </select>
              </label>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {activeFilters.map((f) => (
                  <button key={f.key} onClick={f.clear} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-800 text-xs font-medium hover:bg-primary-100">
                    {f.label} <X size={13} />
                  </button>
                ))}
                <button onClick={clearAll} className="text-xs text-charcoal-500 hover:text-primary-700 underline-offset-2 hover:underline ml-1">Clear all</button>
              </div>
            )}

            {loading ? (
              <SkeletonGrid count={6} kind="puja" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" />
            ) : filtered.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Flower2 size={32} />}
                  title="No pujas match these filters"
                  description="Try a broader search or remove a filter to see more ceremonies."
                  action={<button onClick={clearAll} className="btn-primary">Clear filters</button>}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((p, i) => <PujaCard key={p.id} puja={p} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        footer={
          <div className="flex gap-3">
            <button onClick={clearAll} className="btn-outline flex-1">Clear</button>
            <button onClick={() => setShowFilters(false)} className="btn-primary flex-1">Show {filtered.length} results</button>
          </div>
        }
      >
        {filterPanel}
      </Drawer>
    </div>
  );
}
