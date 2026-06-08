import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an ISO date string into a human-readable local date.
 * e.g. "2024-06-08T12:00:00Z" → "Jun 8, 2024"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString))
  } catch {
    return dateString
  }
}

/**
 * Format an ISO date string into a relative time label.
 * e.g. "2 days ago", "just now"
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    const diffMs = Date.now() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  } catch {
    return dateString
  }
}

/**
 * Format a phone number for display.
 * Handles Indian numbers (+91) and generic international numbers.
 * e.g. "919727686181" → "+91 97276 86181"
 */
export function formatPhone(phone: string): string {
  if (!phone) return '—'
  // Strip all non-digits
  const digits = phone.replace(/\D/g, '')

  // Indian mobile: 91 + 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2)
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  // 10-digit Indian number without country code
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  // Generic: keep with + prefix
  return `+${digits}`
}

/**
 * Format a large number with K/M/B suffixes.
 * e.g. 1500 → "1.5K", 2400000 → "2.4M"
 */
export function formatNumber(n: number): string {
  if (n == null || isNaN(n)) return '0'
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/**
 * Format a currency value (INR by default).
 * e.g. 150000 → "₹1,50,000"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  if (amount == null || isNaN(amount)) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Truncate a string to a max length, appending "…" if cut.
 */
export function truncate(str: string, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 1)}…`
}

/**
 * Convert a pipeline stage key to a display label.
 */
export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  responded: 'Responded',
  qualified: 'Qualified',
  meeting: 'Meeting Booked',
  closed: 'Closed Won',
  lost: 'Lost',
}

export function getPipelineStageLabel(stage: string): string {
  return PIPELINE_STAGE_LABELS[stage] ?? stage
}

/**
 * Convert a rating (0–5) to a star string.
 * e.g. 4.2 → "★★★★☆"
 */
export function formatStars(rating: number, max: number = 5): string {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, max - full))
}

/**
 * Sleep for a given number of milliseconds. Useful for rate-limiting.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Safely parse JSON, returning a fallback value on error.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Generate a short random ID (not cryptographically secure).
 * Suitable for temporary client-side keys.
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 9)
}

