import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder, publicOrder } from "@/lib/orders";
import { OrderStatusView } from "./OrderStatusView";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const order = getOrder(id);
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <OrderStatusView initial={publicOrder(order)} isNew={isNew === "1"} />
    </div>
  );
}
