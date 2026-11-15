import { useState, type MouseEvent } from 'react';
import { Link } from '@/lib/router';
import { useCart } from '@/lib/cart';
import { useToast } from '@/lib/toast';
import { useSavedPandits } from '@/lib/hooks';
import { formatINR, formatDuration, cn } from '@/lib/utils';
import { Stars } from '@/components/ui';
import type { Puja, Pandit, SamagriProduct } from '@/types';
import { Clock, MapPin, Languages, BadgeCheck, ShoppingBag, ArrowUpRight, Heart, Check, Flame, Award, Plus } from 'lucide-react';

export function PujaCard({ puja, index = 0 }: { puja: Puja; index?: number }) {
  return (
    <Link
      to={`/pujas/${puja.slug}`}
      className="card-hover group overflow-hidden flex flex-col animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: 'backwards' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
        {puja.image_url ? (
          <img
            src={puja.image_url}
            alt={puja.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="w-full h-full bg-rangoli-light" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 via-charcoal-900/10 to-transparent" />
        {puja.category && (
          <span className="absolute top-3 left-3 badge bg-cream-50/90 text-primary-800 backdrop-blur-sm shadow-soft">
            {puja.category.name}
          </span>
        )}
        {puja.is_featured && (
          <span className="absolute top-3 right-3 badge bg-gradient-to-r from-accent-300 to-accent-500 text-charcoal-800 shadow-soft">
            <Award size={12} /> Featured
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-cream-50 text-xs">
          <span className="flex items-center gap-1.5 bg-charcoal-900/40 backdrop-blur-md rounded-full px-2.5 py-1">
            <Clock size={12} /> {formatDuration(puja.duration_mins)}
          </span>
          <span className="flex items-center gap-1.5 bg-charcoal-900/40 backdrop-blur-md rounded-full px-2.5 py-1">
            <Flame size={12} className="text-accent-300" /> {puja.popularity} booked
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-xl text-charcoal-800 group-hover:text-primary-700 transition-colors">{puja.name}</h3>
        <p className="text-sm text-charcoal-500 mt-1.5 line-clamp-2 flex-1">{puja.short_description || puja.description}</p>
        <div className="mt-5 pt-4 border-t border-dashed border-cream-400/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-charcoal-400">Starts at</p>
            <p className="font-display text-lg font-semibold text-primary-700 leading-tight">{formatINR(puja.starting_price)}</p>
          </div>
          <span className="w-10 h-10 rounded-full border border-primary-200 text-primary-700 flex items-center justify-center transition-all duration-300 group-hover:bg-primary-700 group-hover:text-cream-50 group-hover:border-primary-700 group-hover:rotate-45">
            <ArrowUpRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function SavePanditButton({ panditId, className, withLabel }: { panditId: string; className?: string; withLabel?: boolean }) {
  const { isSaved, toggle } = useSavedPandits();
  const { show } = useToast();
  const saved = isSaved(panditId);

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggle(panditId);
    show(nowSaved ? 'Pandit saved to your list' : 'Removed from saved pandits', nowSaved ? 'success' : 'info');
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save pandit'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 active:scale-90',
        withLabel ? 'btn-outline' : 'w-9 h-9 bg-cream-50/90 backdrop-blur border border-cream-300 hover:border-primary-300 shadow-soft',
        className,
      )}
    >
      <Heart size={16} className={cn('transition-colors', saved ? 'fill-primary-600 text-primary-600' : 'text-charcoal-500')} />
      {withLabel && (saved ? 'Saved' : 'Save')}
    </button>
  );
}

export function PanditCard({ pandit, index = 0 }: { pandit: Pandit; index?: number }) {
  return (
    <Link
      to={`/pandits/${pandit.id}`}
      className="card-hover group relative flex flex-col p-5 animate-fade-up overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: 'backwards' }}
    >
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary-50 via-cream-100 to-accent-50 bg-rangoli-light" aria-hidden="true" />
      <SavePanditButton panditId={pandit.id} className="absolute top-3 right-3 z-10" />

      <div className="relative flex items-end gap-4">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-accent-300 via-accent-500 to-primary-600">
            <div className="w-full h-full rounded-full overflow-hidden bg-cream-200 border-2 border-cream-50">
              {pandit.photo_url ? (
                <img src={pandit.photo_url} alt={pandit.display_name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <span className="w-full h-full flex items-center justify-center font-display text-2xl text-primary-400">{pandit.display_name[0]}</span>
              )}
            </div>
          </div>
          {pandit.verification_status === 'verified' && (
            <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-cream-50 flex items-center justify-center" title="Verified">
              <BadgeCheck size={20} className="text-success-600 fill-success-100" />
            </span>
          )}
        </div>
        <div className="min-w-0 pb-1">
          <div className="flex items-center gap-1.5 bg-cream-50 rounded-full px-2 py-0.5 w-fit shadow-soft">
            <Stars rating={pandit.rating} size={11} />
            <span className="text-[11px] font-semibold text-charcoal-700">{pandit.rating}</span>
            <span className="text-[11px] text-charcoal-400">({pandit.total_reviews})</span>
          </div>
        </div>
      </div>

      <h3 className="relative font-display font-semibold text-xl text-charcoal-800 group-hover:text-primary-700 transition-colors mt-4">{pandit.display_name}</h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-500 mt-1.5">
        <span className="flex items-center gap-1"><MapPin size={12} className="text-primary-500" /> {pandit.location}</span>
        <span className="flex items-center gap-1"><Award size={12} className="text-primary-500" /> {pandit.experience_years} yrs</span>
        <span className={cn('flex items-center gap-1', pandit.is_available ? 'text-success-700' : 'text-charcoal-400')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', pandit.is_available ? 'bg-success-500' : 'bg-charcoal-300')} />
          {pandit.is_available ? 'Available' : 'Unavailable'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {pandit.specializations.slice(0, 3).map((s) => (
          <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">{s}</span>
        ))}
        {pandit.specializations.length > 3 && (
          <span className="text-[11px] px-2 py-1 text-charcoal-400">+{pandit.specializations.length - 3}</span>
        )}
      </div>
      <p className="flex items-center gap-1.5 mt-3 text-xs text-charcoal-500 flex-1">
        <Languages size={13} className="text-charcoal-400 shrink-0" /> <span className="line-clamp-1">{pandit.languages.join(' · ')}</span>
      </p>

      <div className="mt-5 pt-4 border-t border-dashed border-cream-400/80 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400">Dakshina from</p>
          <p className="font-display text-lg font-semibold text-primary-700 leading-tight">{formatINR(pandit.base_price)}</p>
        </div>
        <span className="text-sm font-medium text-primary-700 flex items-center gap-1 group-hover:gap-2 transition-all">
          View profile <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

export function ProductCard({ product, index = 0 }: { product: SamagriProduct; index?: number }) {
  const { addItem, items } = useCart();
  const { show } = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.stock <= 0;
  const inCart = items.find((i) => i.product.id === product.id)?.quantity || 0;

  const add = () => {
    if (outOfStock) return;
    addItem(product);
    show(`${product.name} added to cart`, 'success');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div
      className="card-hover group overflow-hidden flex flex-col animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: 'backwards' }}
    >
      <Link to={`/samagri/${product.slug}`} className="relative aspect-square overflow-hidden bg-cream-200 block">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={cn('w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]', outOfStock && 'grayscale opacity-70')}
          />
        ) : (
          <div className="w-full h-full bg-rangoli-light" />
        )}
        {outOfStock ? (
          <span className="absolute top-3 left-3 badge bg-charcoal-800/90 text-cream-50">Out of stock</span>
        ) : product.stock < 20 ? (
          <span className="absolute top-3 left-3 badge bg-warning-100/95 text-warning-800">Only {product.stock} left</span>
        ) : null}
        {inCart > 0 && (
          <span className="absolute top-3 right-3 badge bg-primary-700 text-cream-50"><ShoppingBag size={11} /> {inCart} in cart</span>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1">
        {product.category && <p className="text-[10px] uppercase tracking-[.16em] text-accent-700 font-semibold mb-1">{product.category.name}</p>}
        <Link to={`/samagri/${product.slug}`}>
          <h3 className="font-display text-[17px] font-semibold text-charcoal-800 group-hover:text-primary-700 transition-colors line-clamp-1">{product.name}</h3>
        </Link>
        <p className="text-xs text-charcoal-500 mt-1 line-clamp-2 flex-1">{product.description}</p>
        <div className="flex items-end justify-between mt-4 gap-2">
          <div className="min-w-0">
            <span className="font-display text-lg font-semibold text-primary-700">{formatINR(product.price)}</span>
            <span className="text-[11px] text-charcoal-400 ml-1">/ {product.unit}</span>
          </div>
          <button
            onClick={add}
            disabled={outOfStock}
            aria-label={`Add ${product.name} to cart`}
            className={cn(
              'h-9 rounded-full flex items-center justify-center gap-1 text-xs font-medium transition-all duration-300 shrink-0 active:scale-90',
              justAdded ? 'w-9 bg-success-600 text-white' : 'w-9 sm:w-auto sm:px-3.5 bg-primary-700 text-cream-50 hover:bg-primary-800 shadow-soft',
              outOfStock && 'opacity-40 cursor-not-allowed',
            )}
          >
            {justAdded ? <Check size={16} /> : <><Plus size={15} /><span className="hidden sm:inline">Add</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
