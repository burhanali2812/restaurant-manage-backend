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

module.exports = router;