import type { HTMLAttributes } from "react";

export function Panel({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-2 border-chrome bg-plate ${className}`} {...props} />
  );
}