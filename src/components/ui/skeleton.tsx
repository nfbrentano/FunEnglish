export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-border-subtle motion-reduce:animate-none ${className}`}
    />
  );
}
