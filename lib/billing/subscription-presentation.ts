export type SubscriptionDatePresentation = {
  planDate: string;
  accessDate: string;
  notice: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function getSubscriptionDatePresentation(input: { isActive: boolean; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }): SubscriptionDatePresentation | null {
  if (!input.isActive || !input.currentPeriodEnd) return null;
  const formattedDate = formatDate(input.currentPeriodEnd);
  if (!formattedDate) return null;
  if (input.cancelAtPeriodEnd) return { planDate: `Cancels on ${formattedDate}`, accessDate: `Access until ${formattedDate}`, notice: `Your subscription is scheduled to cancel. You will keep access until ${formattedDate}.` };
  return { planDate: `Renews on ${formattedDate}`, accessDate: `Renewal date: ${formattedDate}`, notice: null };
}
