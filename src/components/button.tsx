import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-black/80"
      : "border border-neutral-200 bg-white text-accent hover:bg-neutral-100";

  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}
