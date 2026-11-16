import { createLucideIcon, Gem, Heart, Shield, Sunrise, PartyPopper, Flower2, type LucideIcon } from 'lucide-react';

/**
 * Lotus: peace, purity and spiritual calm. Lucide has no lotus, so it is drawn on the same
 * 24px grid with the same 2px rounded stroke as the library icons.
 */
export const Lotus = createLucideIcon('Lotus', [
  ['path', { d: 'M12 20c-2.5-2.5-3.5-5.5-3.5-8.5S10 6 12 4c2 2 3.5 4.5 3.5 7.5s-1 6-3.5 8.5z', key: 'petal-c' }],
  ['path', { d: 'M12 20c-5 0-8.5-3-9.5-8 2-.2 4.3.3 6.2 1.5', key: 'petal-l' }],
  ['path', { d: 'M12 20c5 0 8.5-3 9.5-8-2-.2-4.3.3-6.2 1.5', key: 'petal-r' }],
]);

// Maps the `icon` names stored on categories (database values) to the icons shown.
const icons: Record<string, LucideIcon> = {
  // Prosperity is stored as 'Sparkles' (older rows may say 'Coins'): shown as a jewel for wealth and abundance.
  Sparkles: Gem,
  Coins: Gem,
  Heart,
  // Peace & Harmony is stored as 'Dove': shown as a lotus.
  Dove: Lotus,
  Shield,
  Rocket: Sunrise,
  PartyPopper,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && icons[name]) || Flower2;
}
