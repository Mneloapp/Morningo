import { type InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-full border border-neutral-200 bg-white px-5 text-sm text-accent outline-none transition placeholder:text-neutral-400 focus:border-accent focus:ring-4 focus:ring-neutral-100 ${className}`}
      {...props}
    />
  );
}
