export const ORDER_STATUS = ['PENDING', 'PAID', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

