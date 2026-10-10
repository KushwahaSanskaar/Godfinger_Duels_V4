import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: "blue",
  ghost: "gray",
  danger: "red",
};

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
