import type { ReactNode } from "react";
import { WarningIcon } from "./Icons";

export function Notice({
  className,
  title,
  icon = <WarningIcon />,
  children,
}: {
  className: string;
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-1 flex-wrap items-center justify-center gap-x-3 border-2 px-4 py-4 text-center ${className}`}
    >
      <span
        className="text-trim font-pixel tracking-wider text-white"
        style={{ fontSize: "clamp(12px,1vw,22px)" }}
      >
        {icon} {title}
      </span>
      {children && (
        <span
          className="text-trim font-sans font-bold"
          style={{ fontSize: "clamp(10px,.7vw,18px)" }}
        >
          {children}
        </span>
      )}
    </div>
  );
}