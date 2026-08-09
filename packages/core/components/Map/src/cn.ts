/**
 * Simple class merging utility — UnoCSS version.
 *
 * Unlike Tailwind (which needs tailwind-merge), UnoCSS generates CSS on-demand
 * with no priority conflicts, so a simple filter+join is sufficient.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
