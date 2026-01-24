export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (inThrottle) return;

    func(...args);
    inThrottle = true;
    setTimeout(() => (inThrottle = false), limit);
  };
}
