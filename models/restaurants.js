const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    waiters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Waiter" }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    monthlyCharge: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Restaurant", restaurantSchema);
