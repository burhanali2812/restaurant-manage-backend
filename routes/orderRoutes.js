const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");
const Restaurant = require("../models/restaurants");
const Waiter = require("../models/waiters");
const OrderCounter = require("../models/orderCounter");
const printKitchenToken = require("../services/printerServices").printKitchenToken;
const printWaiterToken = require("../services/printerServices").printWaiterToken;
const printCustomerBill = require("../services/printerServices").printCustomerBill;
const printPaidBill = require("../services/printerServices").printPaidBill;


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
        variantName: item.variantName,
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
const cleanedWaiterId =
  waiterId && waiterId.trim() !== "" ? waiterId : null;

    const order = await Order.create({
      restaurantId,
      tableNo,
      orderType,
      OrderNo: `ORD-${OrderCount}`,
      waiterId : cleanedWaiterId,
      items: formattedItems,
      subtotal,
      discount,
      total,
    });
    const restaurant = await Restaurant.findById(restaurantId);
    const waiter = cleanedWaiterId ? await Waiter.findById(cleanedWaiterId) : null;

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
      restaurant,
      waiter
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
      .populate("items.productId", "name price").sort({ createdAt: -1 });

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
    const restaurant = await Restaurant.findById(updatedOrder.restaurantId);
    const waiter = updatedOrder.waiterId ? await Waiter.findById(updatedOrder.waiterId) : null;

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
      restaurant,
      waiter
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



router.get("/recent-orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("waiterId", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    const recentOrders = orders.map((order) => ({
      id: order._id,
      orderNo: `#${order.OrderNo}`,
      waiter: order.waiterId?.name || "N/A",
      status:
        order.status === "paid"
          ? "Completed"
          : order.status === "in-progress"
          ? "In Progress"
          : order.status.charAt(0).toUpperCase() + order.status.slice(1),
      amount: order.total,
      time: new Date(order.createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    }));

    res.status(200).json({
      success: true,
      data: recentOrders,
    });
  } catch (error) {
    console.error("Recent Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent orders",
    });
  }
});
router.get("/metrics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const [
      totalOrders,
      pendingOrders,
      activeOrders,
      inProgressOrders,
      completedOrders,
      salesResult,
    ] = await Promise.all([
      Order.countDocuments(filter),

      Order.countDocuments({
        ...filter,
        status: "pending",
      }),

      Order.countDocuments({
        ...filter,
        status: {
          $in: ["pending", "ready", "served"],
        },
      }),

      Order.countDocuments({
        ...filter,
        status: "in-progress",
      }),

      Order.countDocuments({
        ...filter,
        status: {
          $in: ["paid", "delivered"],
        },
      }),

      Order.aggregate([
        {
          $match: {
            ...filter,
            status: {
              $in: ["paid", "delivered"],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: {
              $sum: "$total",
            },
          },
        },
      ]),
    ]);

    const totalSales = salesResult[0]?.totalSales || 0;

    res.status(200).json({
      totalSales,
      totalOrders,
      pendingOrders,
      activeOrders,
      inProgressOrders,
      completedOrders,
    });
  } catch (error) {
    console.error("Metrics Error:", error);

    res.status(500).json({
      message: "Failed to fetch dashboard metrics",
      error: error.message,
    });
  }
});

module.exports = router;