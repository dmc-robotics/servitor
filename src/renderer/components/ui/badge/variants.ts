/**
 * Badge class maps
 * Shared by Badge and ClickableBadge (a badge rendered as a button)
 */

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'danger'
export type BadgeSize = 'default' | 'sm'

export const BADGE_BASE_CLASSES = 'inline-flex items-center gap-1 rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground',
  success: 'border-success text-success',
  danger: 'border-destructive text-destructive'
}

export const BADGE_SIZE_CLASSES: Record<BadgeSize, string> = {
  default: 'px-2.5 py-0.5 text-xs',
  sm: 'px-1.5 py-0 text-[10px]'
}
