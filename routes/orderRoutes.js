const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");
const Restaurant = require("../models/restaurants");
const Waiter = require("../models/waiters");
const OrderCounter = require("../models/orderCounter");

router.post("/addOrder", authMiddleWare, async (req, res) => {
  try {
    const {
      restaurantId,
      tableNo,
      orderType,
   
      waiterId,
      items,
      discount = 0,
    } = req.body;

    if (!restaurantId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "restaurantId, and items are required",
      });
    }

    let subtotal = 0;

    const formattedItems = items.map((item) => {
      const total = item.price * item.quantity;
      subtotal += total;

      return {
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total,
      };
    });

    const total = subtotal - discount;
   let counter = await OrderCounter.findOne({ key: "order" });

if (!counter) {
  counter = await OrderCounter.create({
    key: "order",
    value: 1000,
  });
}

counter.value += 1;
await counter.save();

const OrderCount = counter.value;

    const order = await Order.create({
      restaurantId,
      tableNo,
      orderType,
      OrderNo: `ORD-${OrderCount}`,
      waiterId,
      items: formattedItems,
      subtotal,
      discount,
      total,
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/getOrders", authMiddleWare, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("restaurantId", "name")
      .populate("waiterId", "name")
      .populate("items.productId", "name price");

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================
// GET SINGLE ORDER
// =========================
router.get("/getOrder/:id", authMiddleWare, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("restaurantId")
      .populate("waiterId")
      .populate("items.productId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================
// UPDATE ORDER
// =========================
router.put("/updateOrder/:id", authMiddleWare, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================
// DELETE ORDER
// =========================
router.delete("/deleteOrder/:id", authMiddleWare, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;