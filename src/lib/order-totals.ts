import type { ShopOrder } from "@/lib/types";

export function paymentTotals(orders: ShopOrder[]) {
  const active = orders.filter((order) => order.status !== "batal");
  const paid = active.filter((order) => order.paid).reduce((sum, order) => sum + order.total, 0);
  const unpaid = active.filter((order) => !order.paid).reduce((sum, order) => sum + order.total, 0);
  return {
    paid,
    unpaid,
    all: paid + unpaid,
    paidCount: active.filter((order) => order.paid).length,
    unpaidCount: active.filter((order) => !order.paid).length,
  };
}
