import { useState } from 'react';
import { Link, useRouter } from '@/lib/router';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { createSamagriOrder } from '@/lib/data';
import { EmptyState, Breadcrumbs, Ornament } from '@/components/ui';
import { formatINR, cn } from '@/lib/utils';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft, MapPin, Banknote, Smartphone, ShieldCheck, CheckCircle2, Info, Lock } from 'lucide-react';

const paymentOptions = [
  { id: 'cod', label: 'Cash on delivery', desc: 'Pay in cash when your samagri arrives', icon: Banknote },
  { id: 'upi_on_delivery', label: 'UPI on delivery', desc: 'Scan & pay with any UPI app at your door', icon: Smartphone },
];

export function CartPage() {
  const { items, updateQuantity, removeItem, total, count, clearCart } = useCart();
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { show } = useToast();
  const [stage, setStage] = useState<'cart' | 'checkout'>('cart');
  const [form, setForm] = useState({ address: '', city: profile?.location || '', pincode: '' });
  const [payment, setPayment] = useState('cod');
  const [submitted, setSubmitted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placedRef, setPlacedRef] = useState<{ ref: string; total: number } | null>(null);

  const errors = {
    address: !form.address.trim() ? 'Please enter your delivery address' : '',
    city: !form.city.trim() ? 'Please enter your city' : '',
    pincode: !/^\d{6}$/.test(form.pincode.trim()) ? 'Enter a valid 6-digit pincode' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const goToCheckout = () => {
    if (!profile) {
      show('Please sign in to check out', 'info');
      navigate('/auth?next=/cart');
      return;
    }
    setStage('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrder = async () => {
    setSubmitted(true);
    if (!profile || hasErrors) return;
    setPlacing(true);
    try {
      const order = await createSamagriOrder({
        customer_id: profile.id,
        items,
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        payment_method: payment,
      });
      setPlacedRef({ ref: order.order_ref, total: order.total });
      clearCart();
      show('Order placed, awaiting confirmation', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Could not place your order', 'error');
    }
    setPlacing(false);
  };

  if (placedRef) {
    return (
      <div className="pt-28 lg:pt-32 min-h-[80vh]">
        <div className="section max-w-xl text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-success-100 flex items-center justify-center animate-scale-in">
            <CheckCircle2 size={40} className="text-success-600" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-charcoal-800 mt-6">Order received</h1>
          <p className="text-charcoal-500 mt-3">Your order is <b>pending confirmation</b>. No payment has been taken. You'll pay on delivery.</p>
          <div className="card p-6 mt-8 text-left">
            <div className="flex justify-between items-center pb-4 border-b border-dashed border-cream-400">
              <span className="text-sm text-charcoal-500">Order reference</span>
              <span className="font-display text-lg font-semibold text-primary-700">{placedRef.ref}</span>
            </div>
            <div className="flex justify-between items-center pt-4 text-sm">
              <span className="text-charcoal-500">Order total</span>
              <span className="font-semibold text-charcoal-800">{formatINR(placedRef.total)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-sm">
              <span className="text-charcoal-500">Status</span>
              <span className="badge bg-warning-100 text-warning-700">Pending</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Link to="/dashboard/orders" className="btn-primary">View My Orders</Link>
            <Link to="/samagri" className="btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pt-28 min-h-[75vh] flex items-center">
        <div className="section w-full">
          <EmptyState
            icon={<ShoppingBag size={34} />}
            title="Your cart is empty"
            description="Browse the samagri store for diyas, idols, incense and complete puja kits."
            action={<Link to="/samagri" className="btn-primary btn-lg">Shop Samagri <ArrowRight size={16} /></Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 lg:pt-28 min-h-screen">
      <div className="section">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Samagri', to: '/samagri' }, { label: stage === 'cart' ? 'Cart' : 'Checkout' }]} />
        <div className="flex flex-wrap items-end justify-between gap-4 mt-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-semibold text-charcoal-800">{stage === 'cart' ? 'Your Cart' : 'Checkout'}</h1>
            <p className="text-sm text-charcoal-500 mt-1">{count} item{count !== 1 ? 's' : ''} · {formatINR(total)}</p>
          </div>
          {/* Progress */}
          <ol className="flex items-center gap-2 text-xs font-medium">
            {['Cart', 'Delivery & payment', 'Confirmation'].map((s, i) => {
              const current = stage === 'cart' ? 0 : 1;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full', i === current ? 'bg-primary-700 text-cream-50' : i < current ? 'bg-primary-50 text-primary-700' : 'bg-cream-200 text-charcoal-400')}>
                    <span className="w-4 h-4 rounded-full bg-cream-50/20 flex items-center justify-center text-[10px]">{i + 1}</span>
                    <span className="hidden sm:inline">{s}</span>
                  </span>
                  {i < 2 && <span className="w-4 h-px bg-cream-400" />}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="min-w-0">
            {stage === 'cart' ? (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <div key={item.product.id} className="card p-3 sm:p-4 flex gap-4 animate-fade-in">
                    <Link to={`/samagri/${item.product.slug}`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-cream-200 shrink-0">
                      {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />}
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.product.category && <p className="text-[10px] uppercase tracking-[.16em] text-accent-700 font-semibold">{item.product.category.name}</p>}
                          <Link to={`/samagri/${item.product.slug}`}>
                            <h3 className="font-display text-lg font-semibold text-charcoal-800 hover:text-primary-700 line-clamp-1">{item.product.name}</h3>
                          </Link>
                          <p className="text-xs text-charcoal-400">{formatINR(item.product.price)} / {item.product.unit}</p>
                        </div>
                        <p className="font-display text-lg font-semibold text-primary-700 shrink-0">{formatINR(item.product.price * item.quantity)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-3">
                        <div className="flex items-center gap-1 border border-cream-400 rounded-full p-0.5 bg-cream-50">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-full hover:bg-cream-200 flex items-center justify-center" aria-label="Decrease quantity">
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.product.stock > 0 && item.quantity >= item.product.stock}
                            className="w-8 h-8 rounded-full hover:bg-cream-200 flex items-center justify-center disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => { removeItem(item.product.id); show(`${item.product.name} removed`, 'info'); }} className="flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-error-600 px-2 py-1.5 rounded-lg hover:bg-error-50 transition-colors">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-2">
                  <Link to="/samagri" className="link-arrow"><ArrowLeft size={14} /> Continue shopping</Link>
                  <button onClick={clearCart} className="text-sm text-charcoal-400 hover:text-error-600">Clear cart</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="card p-6">
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2"><MapPin size={19} className="text-primary-600" /> Delivery address</h2>
                  <div className="grid gap-4 mt-5">
                    <div>
                      <label className="label" htmlFor="addr">Full address</label>
                      <textarea id="addr" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House / flat, street, area, landmark" className={cn('input resize-none', submitted && errors.address && 'input-error')} />
                      {submitted && errors.address && <p className="text-xs text-error-600 mt-1">{errors.address}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label" htmlFor="city">City</label>
                        <input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className={cn('input', submitted && errors.city && 'input-error')} />
                        {submitted && errors.city && <p className="text-xs text-error-600 mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="label" htmlFor="pin">Pincode</label>
                        <input id="pin" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })} placeholder="560038" className={cn('input', submitted && errors.pincode && 'input-error')} />
                        {submitted && errors.pincode && <p className="text-xs text-error-600 mt-1">{errors.pincode}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Lock size={18} className="text-primary-600" /> Payment preference</h2>
                  <div className="grid sm:grid-cols-2 gap-3 mt-5">
                    {paymentOptions.map(({ id, label, desc, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPayment(id)}
                        className={cn('flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all', payment === id ? 'border-primary-600 bg-primary-50/60' : 'border-cream-300 hover:border-cream-400 bg-cream-50')}
                      >
                        <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', payment === id ? 'bg-primary-700 text-cream-50' : 'bg-cream-200 text-charcoal-500')}><Icon size={18} /></span>
                        <span>
                          <span className="block text-sm font-semibold text-charcoal-800">{label}</span>
                          <span className="block text-xs text-charcoal-500 mt-0.5">{desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="flex items-start gap-2 text-xs text-charcoal-500 mt-4 p-3 rounded-xl bg-cream-100">
                    <Info size={14} className="text-accent-700 shrink-0 mt-0.5" />
                    Online payment isn't connected yet. Your order is created as <b>pending</b> and nothing is charged now.
                  </p>
                </div>

                <button onClick={() => setStage('cart')} className="link-arrow"><ArrowLeft size={14} /> Back to cart</button>
              </div>
            )}
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-28">
            <div className="rounded-3xl bg-cream-50 border border-cream-300 shadow-card overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h3 className="font-display text-xl font-semibold text-charcoal-800">Order summary</h3>
                <Ornament className="mt-2 w-20" />
              </div>
              {stage === 'checkout' && (
                <ul className="px-6 space-y-2 max-h-48 overflow-y-auto">
                  {items.map((i) => (
                    <li key={i.product.id} className="flex items-center gap-3 text-sm">
                      <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-cream-200 shrink-0">
                        {i.product.image_url && <img src={i.product.image_url} alt="" className="w-full h-full object-cover" />}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-charcoal-600">{i.product.name} <span className="text-charcoal-400">×{i.quantity}</span></span>
                      <span className="text-charcoal-700">{formatINR(i.product.price * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-6 py-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-charcoal-500"><span>Subtotal ({count} items)</span><span>{formatINR(total)}</span></div>
                <div className="flex justify-between text-charcoal-500"><span>Delivery</span><span className="text-success-700 font-medium">Free</span></div>
                <div className="border-t border-dashed border-cream-400 pt-3 mt-3 flex justify-between items-baseline">
                  <span className="font-medium text-charcoal-700">Total</span>
                  <span className="font-display text-2xl font-semibold text-primary-700">{formatINR(total)}</span>
                </div>
              </div>
              <div className="px-6 pb-6">
                {stage === 'cart' ? (
                  <button onClick={goToCheckout} className="btn-primary btn-lg w-full">Proceed to Checkout <ArrowRight size={16} /></button>
                ) : (
                  <button onClick={placeOrder} disabled={placing} className="btn-primary btn-lg w-full">
                    {placing ? 'Placing order…' : <>Place Order <ArrowRight size={16} /></>}
                  </button>
                )}
                {!profile && <p className="text-[11px] text-charcoal-400 text-center mt-3">You'll be asked to sign in before checkout</p>}
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-charcoal-400 mt-3"><ShieldCheck size={12} /> No payment is processed online</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
