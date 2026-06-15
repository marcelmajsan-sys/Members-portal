export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('hr-HR', { style: 'currency', currency }).format(amount);
}
