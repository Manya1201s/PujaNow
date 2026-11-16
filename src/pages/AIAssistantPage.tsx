import { useState, useRef, useEffect, Fragment, type FormEvent, type ReactNode } from 'react';
import { Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { MessageCircle, Send, RotateCcw, Home, ShoppingBag, CalendarDays, Users, HeartPulse, Info, ArrowUpRight, FlaskConical } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  topic?: string;
  time: string;
}

const suggestionGroups = [
  { title: 'Occasions', icon: Home, items: ['What puja should I perform for a new home?', 'What puja is good for removing obstacles?'] },
  { title: 'Health & peace', icon: HeartPulse, items: ['Which puja is best for health and healing?', 'Tell me about Navagraha Shanti Puja'] },
  { title: 'Samagri & prep', icon: ShoppingBag, items: ['What samagri do I need for Lakshmi Puja?', 'How do I prepare for Satyanarayan Katha?'] },
  { title: 'Festivals', icon: CalendarDays, items: ['Which rituals are performed during Diwali?'] },
  { title: 'Pandits', icon: Users, items: ['How do I find a suitable pandit?'] },
];

const quickSuggestions = [
  'What puja should I perform for a new home?',
  'What samagri do I need for Lakshmi Puja?',
  'Which rituals are performed during Diwali?',
  'How do I find a suitable pandit?',
];

const demoResponses: Record<string, string> = {
  'new home': 'For a new home, **Griha Pravesh Puja** is the most auspicious ceremony. It purifies the space and invites positive energy and prosperity. You may also consider **Vastu Shanti Puja** if there are architectural concerns. Both ceremonies take about 2–3 hours and require a kalash, mango leaves, rice, turmeric, ghee, and havan materials. You can browse pandits who specialize in these pujas on our Find a Pandit page.',
  'health': 'For health and healing, **Maha Mrityunjaya Jaap** is highly recommended. This powerful Lord Shiva mantra is chanted for healing, protection from illness, and longevity. **Saraswati Puja** can also be performed for mental clarity and wellbeing. If someone is recovering from a serious illness, the Maha Mrityunjaya Jaap (108 or 1008 repetitions) is traditionally prescribed.',
  'lakshmi': 'For **Lakshmi Puja**, you will need: Goddess Lakshmi idol, red and yellow flowers (marigold and rose), sweets and fruits, incense sticks, camphor, ghee, coconut, panchamrit (milk, curd, ghee, honey, sugar), and a diya. You can find all these items in our Samagri Store, or order a complete Lakshmi Puja kit for convenience.',
  'navagraha': '**Navagraha Shanti Puja** pacifies the nine planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) and neutralizes their malefic effects. It is recommended when experiencing planetary afflictions in your horoscope. The puja requires nine types of grains, nine colors of cloth, a Navagraha yantra, and specific mantras for each planet. Duration is approximately 2.5 hours.',
  'satyanarayan': 'To prepare for **Satyanarayan Katha**: Set up a clean area with the deity\'s image or idol, gather panchamrit ingredients, sweets and fruits, supari and coins as offerings, yellow flowers, and wheat flour for the prasad. The katha involves narrating the stories of Lord Vishnu\'s devotees. Family members typically gather to listen. Duration is about 3 hours.',
  'obstacles': '**Ganesh Puja** is the most recommended ceremony for removing obstacles, as Lord Ganesha is known as Vighnaharta (remover of hurdles). **Sundarkand Path** is also powerful for overcoming difficulties and gaining courage. For persistent obstacles, performing Ganesh Puja before any new venture is considered highly auspicious.',
  'diwali': 'During **Diwali**, the central ritual is **Lakshmi Puja** on the evening of Amavasya, usually performed together with **Ganesh Puja**. Families clean and decorate the home, draw rangoli at the entrance, light diyas, and offer sweets, flowers and coins to the deities. Many also perform Dhanteras puja two days earlier and Govardhan Puja the day after. Timings follow the local muhurat, so check with your pandit.',
  'pandit': 'To find a suitable pandit, start with the **Find a Pandit** page and filter by your **city**, the **puja** you need, and the **language** you prefer the rituals in. Compare experience, ratings and reviews, and check that the profile shows a **Verified** badge. If you are unsure, you can skip choosing during booking and a verified pandit experienced in that ceremony will be assigned.',
};

const topicActions: Record<string, { label: string; to: string }[]> = {
  'new home': [{ label: 'Explore Griha Pravesh', to: '/explore?q=Griha' }, { label: 'Find a Pandit', to: '/pandits' }],
  'health': [{ label: 'Maha Mrityunjaya Jaap', to: '/explore?q=Mrityunjaya' }],
  'lakshmi': [{ label: 'Shop Samagri', to: '/samagri' }, { label: 'Lakshmi Puja Details', to: '/explore?q=Lakshmi' }],
  'navagraha': [{ label: 'Navagraha Shanti Puja', to: '/explore?q=Navagraha' }],
  'satyanarayan': [{ label: 'Satyanarayan Katha', to: '/explore?q=Satyanarayan' }, { label: 'Shop Samagri', to: '/samagri' }],
  'obstacles': [{ label: 'Explore Ganesh Puja', to: '/explore?q=Ganesh' }],
  'diwali': [{ label: 'Festival Pujas', to: '/explore?category=festivals' }, { label: 'Diwali Samagri', to: '/samagri' }],
  'pandit': [{ label: 'Find a Pandit', to: '/pandits' }, { label: 'Plan a Puja', to: '/booking' }],
};

const fallbackResponse = 'I can help you discover the right puja for your needs. Try asking about pujas for specific occasions (new home, wedding, festival), purposes (health, prosperity, protection), or about samagri requirements. You can also browse our full catalogue on the Explore Pujas page. Note: This is a demo assistant. Responses are pre-written, not generated by an AI model.';

function getDemoResponse(query: string): { content: string; topic?: string } {
  const lower = query.toLowerCase();
  for (const [key, response] of Object.entries(demoResponses)) {
    if (lower.includes(key)) return { content: response, topic: key };
  }
  if (lower.includes('festival')) return { content: demoResponses.diwali, topic: 'diwali' };
  return { content: fallbackResponse };
}

/** Renders **bold** segments; everything else is plain text. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-primary-800">{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

let messageId = 0;
const greeting = (): Message => ({
  id: ++messageId,
  role: 'assistant',
  content: 'Namaste! I\'m the PujaNow Assistant. I can help you discover the right pujas, understand rituals, and find samagri requirements. How can I assist you today?',
  time: nowTime(),
});

export function AIAssistantPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => [greeting()]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (text: string) => {
    if (!text.trim() || typing) return;
    setMessages((prev) => [...prev, { id: ++messageId, role: 'user', content: text.trim(), time: nowTime() }]);
    setInput('');
    setTyping(true);
    if (inputRef.current) inputRef.current.style.height = '';

    timer.current = setTimeout(() => {
      const { content, topic } = getDemoResponse(text);
      setMessages((prev) => [...prev, { id: ++messageId, role: 'assistant', content, topic, time: nowTime() }]);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const reset = () => {
    clearTimeout(timer.current);
    setTyping(false);
    setMessages([greeting()]);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const userInitial = profile?.full_name?.[0]?.toUpperCase() || 'Y';

  return (
    <div className="pt-16 lg:pt-20 bg-gradient-to-b from-cream-200/60 to-cream-100">
      <div className="section py-4 lg:py-8">
        <div className="grid lg:grid-cols-[300px_1fr] gap-6 h-[calc(100svh-6rem)] lg:h-[calc(100svh-9rem)] min-h-[560px]">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col rounded-3xl surface-dark p-6 shadow-luxe">
            <div className="relative">
              <span className="w-12 h-12 rounded-2xl bg-accent-400/15 border border-accent-300/30 flex items-center justify-center"><MessageCircle className="text-accent-300" size={22} /></span>
              <h1 className="font-display text-2xl font-semibold text-cream-50 mt-4">Ask the Assistant</h1>
              <p className="text-sm text-cream-100/70 mt-1">Guidance on ceremonies, samagri, festivals and pandits.</p>
            </div>
            <div className="relative flex-1 overflow-y-auto mt-6 -mr-2 pr-2 pb-6 space-y-5 scrollbar-hide mask-fade-b">
              {suggestionGroups.map(({ title, icon: Icon, items }) => (
                <div key={title}>
                  <p className="text-[11px] uppercase tracking-[.2em] text-accent-200 font-semibold flex items-center gap-1.5 mb-2"><Icon size={12} /> {title}</p>
                  <div className="space-y-1.5">
                    {items.map((q) => (
                      <button key={q} onClick={() => send(q)} disabled={typing} className="w-full text-left text-sm text-cream-100/85 px-3 py-2 rounded-xl bg-cream-50/[.04] border border-cream-50/10 hover:bg-cream-50/10 hover:border-accent-300/40 transition-colors disabled:opacity-50">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative mt-5 p-3 rounded-2xl bg-cream-50/[.06] border border-cream-50/10 text-[11px] text-cream-100/70 flex gap-2">
              <FlaskConical size={14} className="text-accent-300 shrink-0 mt-0.5" />
              Demo assistant with pre-written responses. No real AI model is connected.
            </div>
          </aside>

          {/* Chat */}
          <section className="flex flex-col rounded-3xl bg-cream-50 border border-cream-300 shadow-card overflow-hidden min-h-0">
            <header className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-cream-300 bg-cream-50/90 backdrop-blur">
              <span className="relative w-11 h-11 rounded-full bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center text-accent-200 shadow-soft">
                <MessageCircle size={19} />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success-500 ring-2 ring-cream-50" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg font-semibold text-charcoal-800 leading-tight">PujaNow Assistant</p>
                <p className="text-xs text-charcoal-400">{typing ? 'Typing…' : 'Usually replies in a moment'}</p>
              </div>
              <span className="badge bg-accent-100 text-accent-800 border border-accent-200"><FlaskConical size={11} /> Demo</span>
              <button onClick={reset} className="icon-btn text-charcoal-500" aria-label="Start a new conversation" title="New conversation"><RotateCcw size={17} /></button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
              <div className="flex justify-center">
                <span className="text-[11px] text-charcoal-400 bg-cream-50 border border-cream-300 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <Info size={11} /> Responses are pre-written for demonstration
                </span>
              </div>
              {messages.map((m, idx) => (
                <ChatBubble key={m.id} message={m} userInitial={userInitial}>
                  {m.role === 'assistant' && idx > 0 && (
                    <>
                      {m.topic && topicActions[m.topic] && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {topicActions[m.topic].map((a) => (
                            <Link key={a.label} to={a.to} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-cream-50 border border-primary-200 text-primary-700 hover:bg-primary-700 hover:text-cream-50 hover:border-primary-700 transition-colors">
                              {a.label} <ArrowUpRight size={12} />
                            </Link>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-charcoal-500 mt-2 italic">Demo response, not from a real AI model</p>
                    </>
                  )}
                </ChatBubble>
              ))}
              {typing && (
                <div className="flex items-end gap-2.5 animate-fade-in">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-900 text-accent-200 flex items-center justify-center shrink-0"><MessageCircle size={14} /></span>
                  <div className="bg-cream-50 border border-cream-300 rounded-2xl rounded-bl-md px-4 py-3.5 shadow-soft">
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 2 && !typing && (
              <div className="px-4 sm:px-6 pt-3 flex gap-2 overflow-x-auto scrollbar-hide mask-fade-edges border-t border-cream-200">
                {quickSuggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="chip text-xs shrink-0">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={onSubmit} className="p-3 sm:p-4">
              <div className="flex items-end gap-2 rounded-2xl border border-cream-400 bg-white/80 focus-within:ring-4 focus-within:ring-primary-100 focus-within:border-primary-400 transition-all p-1.5 pl-4">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask about pujas, rituals, samagri…"
                  className="flex-1 resize-none bg-transparent py-2.5 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none max-h-36"
                  aria-label="Message"
                />
                <button type="submit" disabled={!input.trim() || typing} className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-cream-50 flex items-center justify-center shrink-0 transition-all hover:shadow-card disabled:opacity-40 active:scale-95" aria-label="Send">
                  <Send size={17} />
                </button>
              </div>
              <p className="text-[11px] text-charcoal-500 text-center mt-2 italic">
                Demo assistant with pre-written responses. No real AI model is connected
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message: m, userInitial, children }: { message: Message; userInitial: string; children?: ReactNode }) {
  const isUser = m.role === 'user';
  return (
    <div className={cn('flex items-end gap-2.5 animate-fade-up', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <span className="w-8 h-8 rounded-full bg-accent-400 text-charcoal-900 text-xs font-semibold flex items-center justify-center shrink-0">{userInitial}</span>
      ) : (
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-900 text-accent-200 flex items-center justify-center shrink-0"><MessageCircle size={14} /></span>
      )}
      <div className={cn('max-w-[85%] sm:max-w-[75%]', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'px-4 py-3 shadow-soft',
          isUser ? 'bg-gradient-to-br from-primary-600 to-primary-800 text-cream-50 rounded-2xl rounded-br-md' : 'bg-cream-50 border border-cream-300 rounded-2xl rounded-bl-md',
        )}>
          <p className={cn('text-sm leading-relaxed whitespace-pre-wrap', isUser ? 'text-cream-50' : 'text-charcoal-700')}>
            {isUser ? m.content : <RichText text={m.content} />}
          </p>
          {children}
        </div>
        <span className="text-[11px] text-charcoal-400 mt-1 px-1">{m.time}</span>
      </div>
    </div>
  );
}
