const { exec } = require("child_process");
const fs = require("fs");

// ========================
// LAYOUT CONSTANTS
// ========================
const WIDTH        = 48;   // total chars per line
const ITEM_NAME_W  = 22;   // item name column width
const ITEM_QTY_W   = 4;    // qty column width
const ITEM_PRICE_W = 10;   // unit price column width
// TOTAL = WIDTH - ITEM_NAME_W - ITEM_QTY_W - ITEM_PRICE_W = 12

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
const line  = () => "-".repeat(WIDTH);
const dline = () => "=".repeat(WIDTH);

/** Left + right values on the same line, padded to WIDTH */
const twoCol = (left, right, width = WIDTH) => {
  left  = String(left  || "");
  right = String(right || "");
  const gap = width - left.length - right.length;
  return gap > 0
    ? left + " ".repeat(gap) + right
    : left.substring(0, width - right.length - 1) + " " + right;
};

/** Build display name: "Daal Mash (Half)" */
const itemLabel = (item) =>
  item.variantName ? `${item.name} (${item.variantName})` : item.name;

/**
 * Build one item's row(s).
 * - First line : name (word-wrapped to ITEM_NAME_W) + qty + price + total
 * - Extra lines: indented name continuation only — columns stay intact
 */
const buildItemLine = (item) => {
  const label    = itemLabel(item);
  const total    = item.quantity * item.price;
  const qtyStr   = String(item.quantity).padEnd(ITEM_QTY_W);
  const priceStr = `Rs.${item.price.toFixed(2)}`.padEnd(ITEM_PRICE_W);
  const totalStr = `Rs.${total.toFixed(2)}`;

  // Word-boundary wrap into ITEM_NAME_W-wide chunks
  const words  = label.split(" ");
  const chunks = [];
  let current  = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > ITEM_NAME_W) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);

  const rows = [];
  // First chunk: all columns on one line
  rows.push(chunks[0].padEnd(ITEM_NAME_W) + qtyStr + priceStr + totalStr);
  // Continuation lines: indented, no numbers
  for (let i = 1; i < chunks.length; i++) {
    rows.push("  " + chunks[i]);
  }

  return rows.join("\n");
};

// ========================
// SHARED BILL BUILDER
// ========================
const buildBillData = (order) => {
  let subtotal = 0;

  const itemLines = order.items.map((i) => {
    subtotal += i.quantity * i.price;
    return buildItemLine(i);
  });

  const discount   = order.discount || 0;
  const grandTotal = order.total;
  const change     = order.amountPaid != null ? order.amountPaid - grandTotal : null;

  return { itemLines, subtotal, discount, grandTotal, change };
};

// ========================
// KITCHEN TOKEN
// ========================
const printKitchenToken = (order) => {
  const items = order.items
    .map((i) => `  ${i.quantity} x ${itemLabel(i)}`)
    .join("\n");

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  const content = [
    "KITCHEN",
    line(),
    twoCol(`Order #: ${order.OrderNo}`, `Table: ${order.tableNo || "-"}`),
    `Type  : ${(order.orderType || "dine-in").toUpperCase()}`,
    `Time  : ${new Date().toLocaleTimeString()}`,
    line(),
    "  ITEMS",
    line(),
    items,
    line(),
    `Total Items: ${totalQty}`,
  ].join("\n");

  printToDefaultPrinter(content);
};

// ========================
// WAITER TOKEN
// ========================
const printWaiterToken = (order, waiter) => {
  const content = [
    "WAITER",
    line(),
    `Order #: ${order.OrderNo}`,
    `Waiter : ${waiter || "-"}`,
    `Table  : ${order.tableNo || "-"}`,
    `Items  : ${order.items.length}`,
    `Time   : ${new Date().toLocaleTimeString()}`,
  ].join("\n");

  printToDefaultPrinter(content);
};

// ========================
// CUSTOMER BILL (UNPAID)
// ========================
const printCustomerBill = (order, restaurant) => {
  const { itemLines, subtotal, discount, grandTotal } = buildBillData(order);

  const colHeader =
    "ITEM".padEnd(ITEM_NAME_W) +
    "QTY".padEnd(ITEM_QTY_W) +
    "PRICE".padEnd(ITEM_PRICE_W) +
    "TOTAL";

  const rows = [
    // --- HEADER ---
    restaurant.name || "RESTAURANT",
  ];
  if (restaurant.tagline) rows.push(restaurant.tagline);
  if (restaurant.address) rows.push(restaurant.address);
  if (restaurant.phone)   rows.push(`Tel: ${restaurant.phone}`);

  rows.push(
    dline(),
    // --- ORDER INFO ---
    twoCol(`Order #: ${order.OrderNo}`, `Table: ${order.tableNo || "-"}`),
    twoCol(
      `Type: ${(order.orderType || "dine-in").toUpperCase()}`,
      `Date: ${new Date().toLocaleDateString()}`
    ),
    `Time: ${new Date().toLocaleTimeString()}`,
    line(),
    // --- ITEMS TABLE ---
    colHeader,
    line(),
    itemLines.join("\n"),
    line(),
    // --- TOTALS ---
    twoCol("Subtotal:", `Rs.${subtotal.toFixed(2)}`),
  );

  if (discount > 0) rows.push(twoCol("Discount:", `-Rs.${discount.toFixed(2)}`));

  rows.push(
    dline(),
    twoCol("TOTAL:", `Rs.${grandTotal.toFixed(2)}`),
    dline(),
    // --- STATUS ---
    "** BILL - NOT YET PAID **",
  );

  printToDefaultPrinter(rows.join("\n"));
};

// ========================
// PAID RECEIPT
// ========================
const printPaidBill = (order, restaurant, waiter) => {
  const { itemLines, subtotal, discount, grandTotal, change } = buildBillData(order);

  const colHeader =
    "ITEM".padEnd(ITEM_NAME_W) +
    "QTY".padEnd(ITEM_QTY_W) +
    "PRICE".padEnd(ITEM_PRICE_W) +
    "TOTAL";

  const rows = [
    // --- HEADER ---
    restaurant.name || "RESTAURANT",
  ];
  if (restaurant.tagline) rows.push(restaurant.tagline);
  if (restaurant.address) rows.push(restaurant.address);
  if (restaurant.phone)   rows.push(`Tel: ${restaurant.phone}`);

  rows.push(
    dline(),
    // --- ORDER INFO ---
    twoCol(`Order #: ${order.OrderNo}`, `Table: ${order.tableNo || "-"}`),
    twoCol(
      `Type: ${(order.orderType || "dine-in").toUpperCase()}`,
      `Date: ${new Date().toLocaleDateString()}`
    ),
    `Time: ${new Date().toLocaleTimeString()}`,
  );

  if (waiter) rows.push(`Waiter: ${waiter.name || waiter}`);

  rows.push(
    line(),
    // --- ITEMS TABLE ---
    colHeader,
    line(),
    itemLines.join("\n"),
    line(),
    // --- TOTALS ---
    twoCol("Subtotal:", `Rs.${subtotal.toFixed(2)}`),
  );

  if (discount > 0) rows.push(twoCol("Discount:", `-Rs.${discount.toFixed(2)}`));

  rows.push(dline(), twoCol("TOTAL:", `Rs.${grandTotal.toFixed(2)}`), dline());

  // --- PAYMENT INFO ---
  if (order.amountPaid != null)
    rows.push(twoCol("Cash Received:", `Rs.${Number(order.amountPaid).toFixed(2)}`));
  if (change != null && change >= 0)
    rows.push(twoCol("Change:", `Rs.${change.toFixed(2)}`));
  if (order.paymentMethod)
    rows.push(twoCol("Payment Via:", order.paymentMethod.toUpperCase()));

  rows.push(
    line(),
    // --- FOOTER ---
    "** PAID **",
    "",
    "Thank you for dining with us!",
  );

  if (restaurant.name)      rows.push(`Visit us again at ${restaurant.name}`);
  if (restaurant.website)   rows.push(restaurant.website);
  if (restaurant.instagram) rows.push(restaurant.instagram);

  rows.push(line(), new Date().toLocaleString());

  printToDefaultPrinter(rows.join("\n"));
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