import {
  BookOpen,
  BookText,
  Clapperboard,
  Headphones,
  Image,
  MessageCircle,
  PartyPopper,
  PenLine,
  WholeWord,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/activities/categories";

const ICONS: Record<string, LucideIcon> = {
  "party-popper": PartyPopper,
  "book-open": BookOpen,
  headphones: Headphones,
  image: Image,
  "book-text": BookText,
  "message-circle": MessageCircle,
  clapperboard: Clapperboard,
  "whole-word": WholeWord,
  "pen-line": PenLine,
};

const SIZES = {
  sm: "size-7 [&>svg]:size-4",
  md: "size-9 [&>svg]:size-5",
  lg: "size-12 [&>svg]:size-6",
};

/** Category icon on a soft tint of the category color. Decorative: pair it with the category name. */
export function CategoryIcon({
  category,
  size = "sm",
}: {
  category: Category;
  size?: keyof typeof SIZES;
}) {
  const Icon = ICONS[category.icon] ?? BookOpen;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${SIZES[size]}`}
      style={{
        color: category.color,
        backgroundColor: `color-mix(in oklab, ${category.color} 16%, transparent)`,
      }}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
