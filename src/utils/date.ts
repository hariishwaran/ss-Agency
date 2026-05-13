/**
 * Calculates the number of days between two dates.
 * Returns null if dates are invalid or if end date is before start date.
 */
export function calculateDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Including the start day in the duration (e.g., May 1 to May 1 is 1 day)
  return diffDays >= 0 ? diffDays + 1 : null;
}

export function isPast(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
}

export function isFuture(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date > now;
}
