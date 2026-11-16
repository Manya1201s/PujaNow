import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/lib/router';
import { fetchSamagriProducts } from '@/lib/data';
import { useCart } from '@/lib/cart';
import { useToast } from '@/lib/toast';
import type { SamagriProduct } from '@/types';
import { LoadingState, ErrorState, Breadcrumbs, Ornament } from '@/components/ui';
import { ProductCard } from '@/components/cards';
import { formatINR, cn } from '@/lib/utils';
import { ShoppingBag, Minus, Plus, ShieldCheck, Truck, PackageCheck, Check, Zap } from 'lucide-react';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { addItem, items } = useCart();
  const { show } = useToast();
  const [product, setProduct] = useState<SamagriProduct | null>(null);
  const [related, setRelated] = useState<SamagriProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSamagriProducts()
      .then((products) => {
        const p = products.find((x) => x.slug === slug);
        if (!p) { setError('Product not found'); return; }
        setProduct(p);
        const same = products.filter((x) => x.id !== p.id && x.category_id === p.category_id);
        const others = products.filter((x) => x.id !== p.id && x.category_id !== p.category_id);
        setRelated([...same, ...others].slice(0, 4));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="pt-24"><LoadingState label="Loading product…" /></div>;
  if (error || !product) return <div className="pt-24"><ErrorState message={error || 'Product not found'} onRetry={() => navigate('/samagri')} /></div>;

  const inCart = items.find((i) => i.product.id === product.id)?.quantity || 0;
  const remaining = Math.max(0, product.stock - inCart);
  const outOfStock = product.stock <= 0;
  const maxQty = Math.max(1, remaining);

  const addToCart = () => {
    if (remaining <= 0) {
      show('You already have all available stock in your cart', 'info');
      return;
    }
    addItem(product, Math.min(qty, remaining));
    show(`${Math.min(qty, remaining)} × ${product.name} added to cart`, 'success');
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    setQty(1);
  };

  const buyNow = () => {
    if (remaining > 0) addItem(product, Math.min(qty, remaining));
    navigate('/cart');
  };

  return (
    <div className="pt-24 lg:pt-28">
      <div className="section">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Samagri', to: '/samagri' }, ...(product.category ? [{ label: product.category.name, to: `/samagri?category=${product.category.slug}` }] : []), { label: product.name }]} />
      </div>

      <div className="section grid lg:grid-cols-2 gap-8 lg:gap-16 items-start mt-6">
        <div className="lg:sticky lg:top-28">
          <div
            className="relative aspect-square rounded-[2rem] overflow-hidden shadow-luxe bg-cream-200 cursor-zoom-in border border-cream-300"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseLeave={() => setZoom(null)}
          >
            {product.image_url && (
              <img
                src={product.image_url.replace('h=600&w=600', 'h=1200&w=1200')}
                alt={product.name}
                className={cn('w-full h-full object-cover transition-transform duration-300', outOfStock && 'grayscale')}
                style={zoom ? { transform: 'scale(1.7)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            )}
            {outOfStock ? (
              <span className="absolute top-5 left-5 badge bg-charcoal-800 text-cream-50 px-3 py-1">Out of stock</span>
            ) : product.stock < 20 && (
              <span className="absolute top-5 left-5 badge bg-warning-100 text-warning-800 px-3 py-1">Only {product.stock} left</span>
            )}
          </div>
        </div>

        <div className="py-2 animate-fade-up">
          {product.category && <p className="eyebrow mb-3">{product.category.name}</p>}
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-charcoal-800 text-balance">{product.name}</h1>
          <div className="flex items-baseline gap-2 mt-5">
            <span className="font-display text-4xl font-semibold text-primary-700">{formatINR(product.price)}</span>
            <span className="text-sm text-charcoal-400">per {product.unit}</span>
          </div>
          <p className="text-xs text-charcoal-400 mt-1">Inclusive of all taxes</p>

          <div className="heritage-rule my-7" />

          <p className="text-charcoal-600 leading-[1.8] text-[16px]">{product.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 border border-cream-400 rounded-full p-1 bg-cream-50">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || outOfStock} className="w-10 h-10 rounded-full hover:bg-cream-200 flex items-center justify-center disabled:opacity-30" aria-label="Decrease quantity">
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-semibold text-charcoal-800" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty || outOfStock} className="w-10 h-10 rounded-full hover:bg-cream-200 flex items-center justify-center disabled:opacity-30" aria-label="Increase quantity">
                <Plus size={16} />
              </button>
            </div>
            <span className={cn('text-sm flex items-center gap-1.5', outOfStock ? 'text-error-600' : 'text-success-700')}>
              <span className={cn('w-2 h-2 rounded-full', outOfStock ? 'bg-error-500' : 'bg-success-500')} />
              {outOfStock ? 'Currently unavailable' : `${product.stock} in stock`}
              {inCart > 0 && <span className="text-charcoal-400"> · {inCart} in your cart</span>}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <button onClick={addToCart} disabled={outOfStock} className={cn('btn-lg', added ? 'btn bg-success-600 text-white' : 'btn-outline')}>
              {added ? <><Check size={17} /> Added</> : <><ShoppingBag size={17} /> Add to Cart</>}
            </button>
            <button onClick={buyNow} disabled={outOfStock && inCart === 0} className="btn-primary btn-lg">
              <Zap size={17} /> Buy Now
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: ShieldCheck, label: 'Quality assured' },
              { icon: Truck, label: 'Doorstep delivery' },
              { icon: PackageCheck, label: 'Puja-ready' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl bg-cream-50 border border-cream-300 p-4 text-center">
                <Icon size={20} className="mx-auto text-primary-600" />
                <p className="text-xs text-charcoal-600 mt-2 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-accent-50 border border-accent-200 text-sm text-charcoal-600">
            Need everything for a specific ceremony? Each puja page lists its full samagri. <Link to="/explore" className="font-medium text-primary-700 hover:underline">Browse pujas →</Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section mt-20">
          <div className="flex flex-col items-center text-center mb-10">
            <p className="eyebrow mb-3">Complete your puja</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold">You may also need</h2>
            <Ornament className="mt-4" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
