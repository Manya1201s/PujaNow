import { Coins, Heart, Bird, Shield, Sunrise, PartyPopper, Flower2, type LucideIcon } from 'lucide-react';

// Maps the `icon` names stored on categories to lucide icons.
const icons: Record<string, LucideIcon> = {
  // The Prosperity category is stored as 'Sparkles'; shown with a coins icon instead.
  Sparkles: Coins,
  Coins,
  Heart,
  Dove: Bird,
  Shield,
  Rocket: Sunrise,
  PartyPopper,
};

export function categoryIcon(name: string | null | undefined): LucideIcon {
  return (name && icons[name]) || Flower2;
}
