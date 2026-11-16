import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/lib/toast';
import {
  fetchPujaOptions, fetchPanditServices, addPanditService, updatePanditServicePrice, removePanditService,
  type PujaOption,
} from '@/lib/panditManagement';
import type { Pandit, PanditService } from '@/types';
import { SectionTitle } from '@/components/DashboardShell';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { formatDuration, formatINR } from '@/lib/utils';
import { Plus, Trash2, Save, Sparkles, Clock } from 'lucide-react';

const MAX_PRICE = 1_000_000;

/** '' → null (use base dakshina); otherwise a whole rupee amount. Returns undefined when invalid. */
function parsePrice(v: string): number | null | undefined {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= MAX_PRICE ? n : undefined;
}

export function ServicesManager({ pandit }: { pandit: Pandit }) {
  const { show } = useToast();
  const [pujas, setPujas] = useState<PujaOption[]>([]);
  const [services, setServices] = useState<PanditService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [newPuja, setNewPuja] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([fetchPujaOptions(), fetchPanditServices(pandit.id)])
      .then(([p, s]) => { setPujas(p); setServices(s); })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load services'))
      .finally(() => setLoading(false));
  }, [pandit.id]);

  const available = useMemo(() => {
    const offered = new Set(services.map((s) => s.puja_id));
    return pujas.filter((p) => !offered.has(p.id));
  }, [pujas, services]);

  const add = async () => {
    setAddError('');
    if (!newPuja) return setAddError('Choose a puja to add.');
    const price = parsePrice(newPrice);
    if (price === undefined) return setAddError(`Enter a whole rupee amount up to ${formatINR(MAX_PRICE)}, or leave it blank.`);
    setAdding(true);
    try {
      await addPanditService(pandit.id, newPuja, price);
      setServices(await fetchPanditServices(pandit.id));
      setNewPuja('');
      setNewPrice('');
      show('Service added', 'success');
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Could not add the service');
    }
    setAdding(false);
  };

  if (loading) return <div><SectionTitle title="Services & Pricing" subtitle="The pujas you perform and your dakshina for each." /><div className="card"><LoadingState label="Loading services…" /></div></div>;
  if (loadError) return <div><SectionTitle title="Services & Pricing" subtitle="The pujas you perform and your dakshina for each." /><div className="card"><ErrorState message={loadError} /></div></div>;

  return (
    <div>
      <SectionTitle title="Services & Pricing" subtitle="The pujas you perform and your dakshina for each." />

      <div className="card p-5 mb-5">
        <p className="text-sm font-semibold text-charcoal-800">Add a puja</p>
        <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3 mt-3 items-start">
          <div>
            <label className="sr-only" htmlFor="svc-puja">Puja</label>
            <select id="svc-puja" className="input" value={newPuja} onChange={(e) => setNewPuja(e.target.value)} disabled={available.length === 0}>
              <option value="">{available.length === 0 ? 'You offer every puja in the catalogue' : 'Choose a puja…'}</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · from {formatINR(p.starting_price)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="svc-price">Your dakshina (₹)</label>
            <input id="svc-price" className="input" type="number" min={0} max={MAX_PRICE} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={`₹ ${pandit.base_price} (base)`} />
          </div>
          <button onClick={add} disabled={adding || available.length === 0} className="btn-primary"><Plus size={15} /> {adding ? 'Adding…' : 'Add'}</button>
        </div>
        {addError && <p className="text-xs text-error-700 mt-2" role="alert">{addError}</p>}
        <p className="text-[11px] text-charcoal-400 mt-2">Leave the price blank to use your base dakshina ({formatINR(pandit.base_price)}).</p>
      </div>

      {services.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Sparkles size={28} />} title="No services yet" description="Add the pujas you perform so devotees can find and book you for them." />
        </div>
      ) : (
        <div className="card divide-y divide-cream-200 overflow-hidden">
          {services.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              basePrice={pandit.base_price}
              onChanged={(updated) => setServices((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
              onRemoved={() => setServices((prev) => prev.filter((x) => x.id !== s.id))}
            />
          ))}
        </div>
      )}
      {pandit.verification_status !== 'verified' && services.length > 0 && (
        <p className="text-xs text-charcoal-400 mt-3">Your services become visible to devotees once your profile is verified.</p>
      )}
    </div>
  );
}

function ServiceRow({ service, basePrice, onChanged, onRemoved }: {
  service: PanditService;
  basePrice: number;
  onChanged: (s: PanditService) => void;
  onRemoved: () => void;
}) {
  const { show } = useToast();
  const [price, setPrice] = useState(service.custom_price == null ? '' : String(service.custom_price));
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState('');
  const dirty = price.trim() !== (service.custom_price == null ? '' : String(service.custom_price));

  const save = async () => {
    setError('');
    const p = parsePrice(price);
    if (p === undefined) return setError('Enter a whole rupee amount, or leave blank for your base dakshina.');
    setBusy('save');
    try {
      await updatePanditServicePrice(service.id, p);
      onChanged({ ...service, custom_price: p });
      show('Price updated', 'success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update the price');
    }
    setBusy(null);
  };

  const remove = async () => {
    setError('');
    setBusy('remove');
    try {
      await removePanditService(service.id);
      onRemoved();
      show(`${service.puja?.name || 'Service'} removed`, 'info');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not remove the service');
      setBusy(null);
    }
  };

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-charcoal-800 truncate">{service.puja?.name || 'Puja'}</p>
          <p className="text-xs text-charcoal-500 mt-0.5 flex items-center gap-3 flex-wrap">
            {service.puja && <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatDuration(service.puja.duration_mins)}</span>}
            {service.puja && <span>Catalogue from {formatINR(service.puja.starting_price)}</span>}
            <span className="text-primary-700 font-medium">You charge {formatINR(service.custom_price ?? basePrice)}{service.custom_price == null ? ' (base)' : ''}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`svc-${service.id}`}>Dakshina for {service.puja?.name}</label>
          <input
            id={`svc-${service.id}`}
            className="input w-32 py-2"
            type="number"
            min={0}
            max={MAX_PRICE}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`₹ ${basePrice}`}
          />
          {dirty && <button onClick={save} disabled={busy !== null} className="btn-primary py-2 px-4"><Save size={14} /> {busy === 'save' ? 'Saving…' : 'Save'}</button>}
          <button onClick={remove} disabled={busy !== null} className="icon-btn text-error-600 hover:bg-error-50" aria-label={`Remove ${service.puja?.name || 'service'}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-error-700 mt-2" role="alert">{error}</p>}
    </div>
  );
}
