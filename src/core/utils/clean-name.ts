/**
 * Strips internal account roles or descriptions in parentheses (e.g. "(عميل عادي)", "(تاجر جملة)", "(موظف المستودع)")
 * from customer or party display names so they never appear to end users or on printed documents.
 */
export function cleanCustomerName(name?: string | null): string {
  if (!name) return '';
  return name
    .replace(
      /\s*[-–—]?\s*\((عميل عادي|عميل تجزئة|تاجر جملة|تاجر معتمد|تاجر|موظف المستودع|موظف تجهيز|مدير النظام|عميل|مورد|customer|wholesale|staff|admin)\)\s*/gi,
      ''
    )
    .trim();
}
