const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const Restaurant = require("../models/restaurants");
const Category = require("../models/categories");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

router.post("/addCategory", authMiddleWare, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {
        const { name, description , restaurantId } = req.body;
        if (!name || !restaurantId) {
            return res.status(400).json({ message: "Name and restaurant ID are required" });
        }
        const existingCategory = await Category.findOne({ name, restaurantId });
        if (existingCategory) {
            return res.status(400).json({ message: "Category already exists" });
        }
        const category = new Category({ name, description, restaurantId });
        await category.save();
        res.status(201).json({ message: "Category added successfully", category });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

router.get("/getCategories/:restaurantId", authMiddleWare, async (req, res) => {
  try {
    const categories = await Category.find({ restaurantId: req.params.restaurantId }).sort({ timestamp: -1 });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.delete("/deleteCategory/:id", authMiddleWare, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {   
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        await Category.findByIdAndDelete(categoryId);
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

router.put("/updateCategory/:id", authMiddleWare, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Access denied" });
  }
    try {
        const categoryId = req.params.id;
        const { name, description } = req.body;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        category.name = name || category.name;
        category.description = description || category.description;
        await category.save();

        res.json({ message: "Category updated successfully", category });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
});

module.exports = router;