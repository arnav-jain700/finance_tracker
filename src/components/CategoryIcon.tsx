import React from 'react';
import {
  Home,
  Utensils,
  Car,
  Film,
  Zap,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Briefcase,
  Laptop,
  TrendingUp,
  CircleDot,
  LucideIcon,
} from 'lucide-react';
import { getCategoryMeta } from '../store';

interface CategoryIconProps {
  category: string;
  className?: string;
  size?: number;
}

const ICON_COMPONENTS: Record<string, LucideIcon> = {
  Home,
  Utensils,
  Car,
  Film,
  Zap,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Briefcase,
  Laptop,
  TrendingUp,
  CircleDot,
};

export function CategoryIcon({ category, className = 'w-4 h-4', size }: CategoryIconProps) {
  const meta = getCategoryMeta(category);
  const IconComp = ICON_COMPONENTS[meta.icon] || CircleDot;
  return <IconComp className={className} size={size} />;
}

export function CategoryBadge({ category, showIcon = true, className = '' }: { category: string; showIcon?: boolean; className?: string }) {
  const meta = getCategoryMeta(category);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bgLight} ${meta.bgDark} ${meta.textLight} ${meta.textDark} ${meta.borderLight} ${meta.borderDark} ${className}`}
    >
      {showIcon && <CategoryIcon category={category} className="w-3.5 h-3.5" />}
      <span>{category}</span>
    </span>
  );
}
