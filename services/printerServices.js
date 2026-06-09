const { exec } = require("child_process");
const fs = require("fs");

const WIDTH = 48;

// ========================
// PRINT ENGINE
// ========================
function printToDefaultPrinter(text) {
  const tempFile = "print.txt";
  fs.writeFileSync(tempFile, text, "utf8");

  exec(`notepad /p ${tempFile}`, (err) => {
    if (err) console.error("Print error:", err);
  });
}

// ========================
// HELPERS
// ========================

// IMPORTANT: NO CENTER (removes side space issue)
function left(text = "") {
  return text;
}

// clean row for kitchen (IMPORTANT FIX)
function kitchenRow(name, qty) {
  const n = name.length > 28 ? name.substring(0, 28) : name;
  const q = String(qty).padStart(3);
  return `${n.padEnd(30)}${q}`;
}

// bill row
function billRow(name, qty, price, total) {
  const n = name.length > 16 ? name.substring(0, 16) : name;
  return `${n.padEnd(16)}${String(qty).padStart(3)}${String(price).padStart(8)}${String(total).padStart(9)}`;
}

// ========================
// KITCHEN TOKEN (FIXED TABLE)
// ========================
const printKitchenToken = (order) => {

  const items = order.items.map((i) => {
    const variant = i.variantName ? ` (${i.variantName})` : "";
    return kitchenRow(`${i.name}${variant}`, i.quantity);
  }).join("\n");

  const content = `
KITCHEN TOKEN
Order: ${order.OrderNo}
Table: ${order.tableNo || "-"}
Time: ${new Date().toLocaleString()}

ITEMS
ITEM                         QTY
----------------------------------------
${items}
`;

  printToDefaultPrinter(content.trim());
};

// ========================
// WAITER TOKEN
// ========================
const printWaiterToken = (order, waiter) => {

  const content = `
WAITER TOKEN
Order: ${order.OrderNo}
Waiter: ${waiter || "-"}
Table: ${order.tableNo || "-"}
Items: ${order.items.length}
Time: ${new Date().toLocaleString()}
`;

  printToDefaultPrinter(content.trim());
};

// ========================
// CUSTOMER BILL
// ========================
const printCustomerBill = (order, restaurant) => {

  let subtotal = 0;

  const items = order.items.map((item) => {
    const total = item.quantity * item.price;
    subtotal += total;

    const variant = item.variantName ? ` (${item.variantName})` : "";
    return billRow(
      item.name + variant,
      item.quantity,
      item.price,
      total
    );
  }).join("\n");

  const content = `
${restaurant.name || "RESTAURANT"}
${restaurant.address || ""}
${restaurant.phone || ""}

Order: ${order.OrderNo}
Table: ${order.tableNo || "-"}
Date: ${new Date().toLocaleString()}

ITEM            QTY     PRICE     TOTAL
----------------------------------------
${items}

Subtotal: Rs.${subtotal}
Discount: Rs.${order.discount || 0}
GRAND TOTAL: Rs.${order.total}

STATUS: UNPAID
`;

  printToDefaultPrinter(content.trim());
};

// ========================
// PAID BILL
// ========================
const printPaidBill = (order, restaurant) => {

  let subtotal = 0;

  const items = order.items.map((item) => {
    const total = item.quantity * item.price;
    subtotal += total;

    const variant = item.variantName ? ` (${item.variantName})` : "";
    return billRow(
      item.name + variant,
      item.quantity,
      item.price,
      total
    );
  }).join("\n");

  const content = `
${restaurant.name || "RESTAURANT"}
${restaurant.address || ""}
${restaurant.phone || ""}

Order: ${order.OrderNo}
Table: ${order.tableNo || "-"}
Date: ${new Date().toLocaleString()}

ITEM            QTY     PRICE     TOTAL
----------------------------------------
${items}

Subtotal: Rs.${subtotal}
Discount: Rs.${order.discount || 0}
PAID: Rs.${order.total}

STATUS: PAID

Thank you!
`;

  printToDefaultPrinter(content.trim());
};

// ========================
// EXPORTS
// ========================
module.exports = {
  printKitchenToken,
  printWaiterToken,
  printCustomerBill,
  printPaidBill,
};