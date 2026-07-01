// Junta classes condicionalmente sem depender de clsx.
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
