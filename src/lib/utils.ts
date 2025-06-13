import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatAmount = (amount: number) => {
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${prefix}${Math.abs(amount).toLocaleString()}`;
};