const mongoose = require("mongoose");

// ========================
// ORDER ITEM SCHEMA
// ========================
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  // Store the chosen variant name at time of order (e.g. "Half", "Full", "Large")
  // This way the receipt always shows the correct variant even if the product changes later.
  variantName: {
    type: String,
    default: null,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});

// ========================
// ORDER SCHEMA
// ========================
const orderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    tableNo: {
      type: String,
    },

    orderType: {
      type: String,
      enum: ["dine-in", "takeaway", "delivery"],
      default: "dine-in",
    },

    OrderNo: {
      type: String,
      required: true,
    },

    waiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Waiter",
      required: false,
    },

    items: [orderItemSchema],

    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
    },

    // Store how much cash the customer handed over (for change calculation on receipt)
    amountPaid: {
      type: Number,
      default: null,
    },

    // e.g. "cash", "card", "online"
    paymentMethod: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "in-progress",
        "ready",
        "served",
        "paid",
        "cancelled",
        "out-for-delivery",
        "delivered",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);