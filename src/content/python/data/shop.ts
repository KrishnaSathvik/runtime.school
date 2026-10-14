/**
 * A small, invented shop dataset used by the pandas lessons. Deterministic text, written next to main.py as files.
 * Every value here is fictional and made for teaching.
 */

export const SHOP_ORDERS_CSV = `order_id,order_date,customer_id,product,category,quantity,unit_price,status
1001,2026-09-01,C01,Desk lamp,lighting,2,24.50,completed
1002,2026-09-01,C02,Oak desk,furniture,1,120.00,completed
1003,2026-09-02,C01,Notebook,stationery,5,3.25,refunded
1004,2026-09-02,C03,Desk lamp,lighting,1,24.50,completed
1005,2026-09-03,C04,Chair,furniture,2,89.00,pending
1006,2026-09-03,C02,Pen set,stationery,3,6.00,completed
1007,2026-09-04,C05,Floor lamp,lighting,1,65.00,completed
1008,2026-09-04,C03,Notebook,stationery,10,3.25,completed
1009,2026-09-05,C01,Chair,furniture,1,89.00,cancelled
1010,2026-09-05,C06,Desk lamp,lighting,3,24.50,completed
1011,2026-09-06,C04,Oak desk,furniture,1,120.00,completed
1012,2026-09-06,C05,Pen set,stationery,2,6.00,completed
`;

export const SHOP_CUSTOMERS_CSV = `customer_id,name,city,joined
C01,Ada,London,2025-01-15
C02,Ben,Leeds,2025-03-02
C03,Cai,London,2025-06-20
C04,Dee,York,2026-01-05
C05,Eve,Leeds,2026-02-11
C06,Fay,Hull,2026-08-30
`;

/** The same kind of orders as they arrive from a careless export: spacing, case, currency text, gaps, duplicates. */
export const SHOP_RAW_ORDERS_CSV = `order_id,order_date,customer_id,product,quantity,unit_price,status
1001,2026-09-01,C01, Desk lamp,2,£24.50,Completed
1002,2026-09-01,C02,Oak desk,1,£120.00,completed
1003,2026-09-02,c01,notebook,5,£3.25,REFUNDED
1004,2026-09-02,C03,Desk Lamp ,1,£24.50,completed
1004,2026-09-02,C03,Desk Lamp ,1,£24.50,completed
1005,2026-09-03,C04,Chair,2,,pending
1006,not a date,C02,Pen set,3,£6.00,completed
1007,2026-09-04,C05,Floor lamp,one,£65.00,completed
1008,2026-09-04,,Notebook,10,£3.25,completed
`;

export const SHOP_FILES = { "orders.csv": SHOP_ORDERS_CSV, "customers.csv": SHOP_CUSTOMERS_CSV };
export const SHOP_RAW_FILES = { ...SHOP_FILES, "raw_orders.csv": SHOP_RAW_ORDERS_CSV };
