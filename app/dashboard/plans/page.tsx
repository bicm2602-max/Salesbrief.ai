import { redirect } from "next/navigation";
import { PlanSelector } from "@/components/billing/plan-selector";
import { getCurrentSubscriptionState } from "@/lib/server/subscription-state";

export default async function DashboardPlansPage() {
  const subscription = await getCurrentSubscriptionState();
  if (!subscription) redirect("/login?next=/dashboard/plans");
  return <PlanSelector currentPlan={subscription.plan} />;
}
