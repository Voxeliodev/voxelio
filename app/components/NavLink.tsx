"use client";

// A drop-in replacement for next/link that forces a full
// page reload on click. Used for nav tabs so state is
// always fresh. Same props as <a>.
export default function NavLink({
  href,
  className,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}