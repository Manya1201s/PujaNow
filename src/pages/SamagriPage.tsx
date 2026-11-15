import { useState, useEffect, useMemo } from 'react';
import { Link } from '@/lib/router';
import { fetchSamagriProducts, fetchSamagriCategories } from '@/lib/data';
import { useCart } from '@/lib/cart';
import type { SamagriProduct, SamagriCategory } from '@/types';
import { ProductCard } from '@/components/cards';
import { EmptyState, PageHero, SkeletonGrid } from '@/components/ui';
import { getQueryParam } from '@/lib/hooks';
import { cn, formatINR } from '@/lib/utils';
import { Search, X, ShoppingBag, ShieldCheck, Truck, PackageCheck, ArrowRight } from 'lucide-react';

type Sort = 'name' | 'price_low' | 'price_high';

const priceFilters = [
  { id: '', label: 'All prices', max: Infinity, min: 0 },
  { id: 'u250', label: 'Under ₹250', min: 0, max: 249 },
  { id: '250-1000', label: '₹250 – ₹1,000', min: 250, max: 1000 },
  { id: '1000+', label: 'Above ₹1,000', min: 1001, max: Infinity },
];

export function SamagriPage() {
  const { count, total } = useCart();
  const [products, setProducts] = useState<SamagriProduct[]>([]);
  const [categories, setCategories] = useState<SamagriCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => getQueryParam('q'));
  const [category, setCategory] = useState(() => getQueryParam('category'));
  const [price, setPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('name');

  useEffect(() => {
    fetchSamagriCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSamagriProducts({ sort })
      .then((data) => { if (active) setProducts(data); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sort]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const pr = priceFilters.find((p) => p.id === price) || priceFilters[0];
    return products.filter(
      (p) =>
        (!s || p.name.toLowerCase().includes(s) || (p.description?.toLowerCase().includes(s) ?? false)) &&
        (!category || p.category?.slug === category) &&
        p.price >= pr.min && p.price <= pr.max &&
        (!inStockOnly || p.stock > 0),
    );
  }, [products, search, category, price, inStockOnly]);

  const clearAll = () => { setSearch(''); setCategory(''); setPrice(''); setInStockOnly(false); };

  return (
    <div className="min-h-screen">
      <PageHero
        eyebrow="Ritual essentials"
        title="The Samagri Store"
        subtitle="Idols, diyas, incense, havan materials and complete puja kits — quality-checked and ready for your ceremony."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Samagri' }]}
        image={products[0]?.image_url || undefined}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1 max-w-2xl bg-cream-50 rounded-full shadow-luxe p-1.5 flex items-center gap-2">
            <Search size={18} className="text-primary-600 ml-4 shrink-0" />
            <input
              type="text"
              placeholder="Search diyas, kalash, incense…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 py-3 bg-transparent text-charcoal-800 placeholder-charcoal-400 focus:outline-none text-[15px]"
              aria-label="Search products"
            />
            {search && <button onClick={() => setSearch('')} className="icon-btn w-9 h-9 text-charcoal-400" aria-label="Clear search"><X size={16} /></button>}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream-100/80">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-accent-300" /> Quality assured</span>
            <span className="flex items-center gap-2"><Truck size={16} className="text-accent-300" /> Doorstep delivery</span>
            <span className="flex items-center gap-2"><PackageCheck size={16} className="text-accent-300" /> Puja-ready</span>
          </div>
        </div>
      </PageHero>

      {/* Categories */}
      <div className="sticky top-16 lg:top-20 z-30 bg-cream-100/90 backdrop-blur-xl border-b border-cream-300/70">
        <div className="section py-3 flex gap-2 overflow-x-auto scrollbar-hide mask-fade-x">
          <button onClick={() => setCategory('')} className={cn('chip', !category && 'chip-active')}>All products</button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.slug)} className={cn('chip', category === c.slug && 'chip-active')}>
              {c.name}
              <span className={cn('text-[10px]', category === c.slug ? 'text-cream-100/70' : 'text-charcoal-400')}>
                {products.filter((p) => p.category?.slug === c.slug).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="section py-8 lg:py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {priceFilters.map((p) => (
              <button key={p.id} onClick={() => setPrice(p.id)} className={cn('chip text-xs', price === p.id && 'chip-active')}>{p.label}</button>
            ))}
            <button onClick={() => setInStockOnly((v) => !v)} className={cn('chip text-xs', inStockOnly && 'chip-active')}>In stock</button>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4">
            <p className="text-sm text-charcoal-500 whitespace-nowrap">
              {loading ? 'Loading…' : <><span className="font-semibold text-charcoal-800">{filtered.length}</span> product{filtered.length !== 1 ? 's' : ''}</>}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="pl-3 pr-8 py-2 rounded-full border border-cream-400 bg-cream-50 text-sm text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
              aria-label="Sort products"
            >
              <option value="name">Name: A to Z</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={8} kind="product" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" />
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ShoppingBag size={32} />}
              title="Nothing matches that search"
              description="Try a different word or browse all categories."
              action={<button onClick={clearAll} className="btn-primary">Show all products</button>}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <Link
            to="/cart"
            className="pointer-events-auto flex items-center gap-4 pl-5 pr-2 py-2 rounded-full bg-charcoal-800 text-cream-50 shadow-luxe animate-fade-up hover:bg-charcoal-900 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm whitespace-nowrap"><ShoppingBag size={17} className="text-accent-300" /> {count} item{count !== 1 ? 's' : ''} · <b>{formatINR(total)}</b></span>
            <span className="btn-accent py-2 px-4 text-xs">View cart <ArrowRight size={14} /></span>
          </Link>
        </div>
      )}
    </div>
  );
}
