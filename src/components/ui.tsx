import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { Link } from '@/lib/router';
import { cn } from '@/lib/utils';
import { Star, ChevronRight, X, AlertTriangle } from 'lucide-react';

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i < full ? 'fill-accent-400 text-accent-400' : i === full && half ? 'fill-accent-400/50 text-accent-400' : 'text-cream-400',
          )}
        />
      ))}
    </div>
  );
}

export function Badge({ children, variant = 'default', className }: { children: ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'primary'; className?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-cream-200 text-charcoal-600',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
    accent: 'bg-accent-100 text-accent-800',
    primary: 'bg-primary-100 text-primary-700',
  };
  return <span className={cn('badge', variants[variant], className)}>{children}</span>;
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-cream-300 border-t-primary-600"
      style={{ width: size, height: size }}
    />
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <Spinner size={40} />
        <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-accent-400 animate-glow-pulse" />
      </div>
      <p className="text-charcoal-400 text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-5 w-20 h-20 rounded-full bg-cream-200/80 flex items-center justify-center text-primary-300 shadow-inner-gold">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-display font-semibold text-charcoal-800 mb-1.5">{title}</h3>
      {description && <p className="text-charcoal-400 text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-error-100 flex items-center justify-center mb-4">
        <AlertTriangle className="text-error-600" size={24} />
      </div>
      <h3 className="text-xl font-display font-semibold text-charcoal-800 mb-1">Something went wrong</h3>
      <p className="text-charcoal-400 text-sm max-w-sm mb-5">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-outline">Go back</button>}
    </div>
  );
}

/** Small lotus-and-line ornament used as a section divider. */
export function Ornament({ className, light }: { className?: string; light?: boolean }) {
  const stroke = light ? '#E5BD5D' : '#C6A15B';
  return (
    <svg viewBox="0 0 120 16" className={cn('w-28 h-4', className)} aria-hidden="true">
      <line x1="0" y1="8" x2="44" y2="8" stroke={stroke} strokeOpacity=".6" />
      <line x1="76" y1="8" x2="120" y2="8" stroke={stroke} strokeOpacity=".6" />
      <path d="M60 1c4 4 4 10 0 14-4-4-4-10 0-14z" fill="none" stroke={stroke} />
      <path d="M50 8c3-3 7-3 10 0-3 3-7 3-10 0zM70 8c-3-3-7-3-10 0 3 3 7 3 10 0z" fill="none" stroke={stroke} />
      <circle cx="40" cy="8" r="1.5" fill={stroke} />
      <circle cx="80" cy="8" r="1.5" fill={stroke} />
    </svg>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, center, light, action }: { eyebrow?: string; title: ReactNode; subtitle?: string; center?: boolean; light?: boolean; action?: ReactNode }) {
  return (
    <div className={cn('mb-10 flex flex-col gap-4', center ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between')}>
      <div className={cn(center && 'flex flex-col items-center')}>
        {eyebrow && <p className={cn('eyebrow mb-3', light && 'eyebrow-light')}>{eyebrow}</p>}
        <h2 className={cn('text-3xl sm:text-4xl font-display font-semibold text-balance', light ? 'text-cream-50' : 'text-charcoal-800')}>{title}</h2>
        {subtitle && <p className={cn('mt-3 max-w-2xl text-pretty', light ? 'text-cream-100/70' : 'text-charcoal-500')}>{subtitle}</p>}
        {center && <Ornament className="mt-5" light={light} />}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Fades content up once it scrolls into view. */
export function Reveal({ children, delay = 0, className, style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('reveal', visible && 'is-visible', className)} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items, light }: { items: Crumb[]; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center flex-wrap gap-1 text-xs', light ? 'text-cream-100/60' : 'text-charcoal-400')}>
      {items.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1">
          {c.to ? (
            <Link to={c.to} className={cn('transition-colors', light ? 'hover:text-accent-300' : 'hover:text-primary-700')}>{c.label}</Link>
          ) : (
            <span className={cn('font-medium', light ? 'text-cream-50' : 'text-charcoal-600')}>{c.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight size={12} className="opacity-60" />}
        </span>
      ))}
    </nav>
  );
}

/** Burgundy page header used across listing pages. */
export function PageHero({ eyebrow, title, subtitle, crumbs, children, image }: { eyebrow?: string; title: ReactNode; subtitle?: string; crumbs?: Crumb[]; children?: ReactNode; image?: string }) {
  return (
    <section className="surface-dark">
      {image && (
        <img src={image} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-[.14] mix-blend-luminosity" />
      )}
      <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full border border-accent-400/20 animate-spin-slow hidden md:block" aria-hidden="true">
        <div className="absolute inset-8 rounded-full border border-dashed border-accent-400/20" />
        <div className="absolute inset-20 rounded-full border border-accent-400/10" />
      </div>
      <div className="section relative pt-28 lg:pt-36 pb-12 lg:pb-16">
        {crumbs && <div className="mb-5"><Breadcrumbs items={crumbs} light /></div>}
        {eyebrow && <p className="eyebrow eyebrow-light mb-3">{eyebrow}</p>}
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-cream-50 text-balance max-w-3xl">{title}</h1>
        {subtitle && <p className="text-cream-100/75 mt-4 max-w-2xl text-base sm:text-lg text-pretty">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
      <div className="heritage-rule absolute bottom-0 inset-x-0" />
    </section>
  );
}

export function PujaCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
        <div className="skeleton h-8 w-full mt-4" />
      </div>
    </div>
  );
}

export function PanditCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className="skeleton w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="skeleton h-3 w-full mt-5" />
      <div className="skeleton h-3 w-2/3 mt-2" />
      <div className="skeleton h-9 w-full mt-5" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-square rounded-none" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-6 w-1/3 mt-3" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count, kind, className }: { count: number; kind: 'puja' | 'pandit' | 'product'; className: string }) {
  const Item = kind === 'puja' ? PujaCardSkeleton : kind === 'pandit' ? PanditCardSkeleton : ProductCardSkeleton;
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => <Item key={i} />)}
    </div>
  );
}

export function Modal({ open, onClose, children, title, size = 'md' }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative bg-cream-50 w-full shadow-elevated max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-scale-in', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300 sticky top-0 bg-cream-50/95 backdrop-blur z-10">
            <h3 className="text-lg font-display font-semibold text-charcoal-800">{title}</h3>
            <button onClick={onClose} className="icon-btn w-8 h-8 text-charcoal-400 hover:text-charcoal-700" aria-label="Close"><X size={18} /></button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** Bottom sheet on mobile, used for filter panels. */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-cream-50 rounded-t-3xl shadow-elevated flex flex-col animate-slide-up">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-cream-400" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="icon-btn w-9 h-9" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5 flex-1">{children}</div>
        {footer && <div className="border-t border-cream-300 p-4">{footer}</div>}
      </div>
    </div>
  );
}

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-5 border-b border-cream-300/80 last:border-0 first:pt-0">
      <h4 className="text-[11px] font-semibold uppercase tracking-[.18em] text-charcoal-400 mb-3">{title}</h4>
      {children}
    </div>
  );
}

export function RadioRow({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors',
        checked ? 'bg-primary-50 text-primary-800 font-medium' : 'text-charcoal-500 hover:bg-cream-200/70',
      )}
    >
      <span className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors', checked ? 'border-primary-600' : 'border-cream-400')}>
        {checked && <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />}
      </span>
      {children}
    </button>
  );
}
