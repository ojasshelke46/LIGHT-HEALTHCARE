type ClassInput = string | false | null | undefined;

/**
 * Hand-rolled class joiner (shadcn-style API, no clsx/tailwind-merge dep).
 * Filters out falsy inputs and joins the rest with a single space.
 */
export function cn(...inputs: ClassInput[]): string {
  return inputs.filter(Boolean).join(" ");
}
