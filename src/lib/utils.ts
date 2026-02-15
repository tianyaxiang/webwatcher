import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(dateStr?: string): string {
  if (!dateStr) return '从未';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'high': return 'text-red-500 bg-red-50';
    case 'medium': return 'text-yellow-500 bg-yellow-50';
    default: return 'text-gray-500 bg-gray-50';
  }
}

export function getImportanceLabel(importance: string): string {
  switch (importance) {
    case 'high': return '重要';
    case 'medium': return '一般';
    default: return '轻微';
  }
}
