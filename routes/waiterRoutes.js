const express = require("express");
const Restaurant = require("../models/restaurants");
const Waiter = require("../models/waiters");


const router = express.Router();

router.post("/addWaiter", async (req, res) => {
  try {
    const { name, restaurantId } = req.body;
    if (!name || !restaurantId) {
      return res.status(400).json({ message: "Name and restaurantId are required" });
    }
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    const waiter = new Waiter({ name, restaurant: restaurantId });
    await waiter.save();
    restaurant.waiters.push(waiter._id);
    await restaurant.save();
    res.status(201).json({ message: "Waiter added successfully", waiter });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.get("/getWaiters/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const waiters = await Waiter.find({ restaurant: restaurantId });
    res.json(waiters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});
router.get("/getWaiter/:id", async (req, res) => {
  try {
    const waiter = await Waiter.findById(req.params.id);
    if (!waiter) {
      return res.status(404).json({ message: "Waiter not found" });
    }
    res.json(waiter);
  }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });

    }
  });

router.delete("/deleteWaiter/:id", async (req, res) => {
  try {
    const waiterId = req.params.id;
    const waiter = await Waiter.findById(waiterId);
    if (!waiter) {
      return res.status(404).json({ message: "Waiter not found" });
    }
    await Waiter.findByIdAndDelete(waiterId);
    res.json({ message: "Waiter deleted successfully" });
  }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

router.put("/updateWaiter/:id", async (req, res) => {
    try {
        const waiterId = req.params.id;
        const { name } = req.body;
        const waiter = await Waiter.findById(waiterId);
        if (!waiter) {
            return res.status(404).json({ message: "Waiter not found" });
        }
        waiter.name = name || waiter.name;
        await waiter.save();
        res.json({ message: "Waiter updated successfully", waiter });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

router.get("/waiters-stats", async (req, res) => {
  try {
    const waiters = await Waiter.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "waiterId",
          as: "orders",
        },
      },
      {
        $project: {
          id: "$_id",
          name: 1,

          activeOrders: {
            $size: {
              $filter: {
                input: "$orders",
                as: "order",
                cond: {
                  $in: [
                    "$$order.status",
                    ["pending", "in-progress", "ready"],
                  ],
                },
              },
            },
          },

          completedOrders: {
            $size: {
              $filter: {
                input: "$orders",
                as: "order",
                cond: {
                  $eq: ["$$order.status", "paid"],
                },
              },
            },
          },

          totalAmount: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$orders",
                    as: "order",
                    cond: {
                      $eq: ["$$order.status", "paid"],
                    },
                  },
                },
                as: "paidOrder",
                in: "$$paidOrder.total",
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: waiters,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch waiter statistics",
    });
  }
});
//set all

module.exports = router;