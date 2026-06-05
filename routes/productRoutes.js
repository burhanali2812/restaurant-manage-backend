const express = require("express");
const User = require("../models/users");
const Restaurant = require("../models/restaurants");
const Product = require("../models/product");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");


const router = express.Router();

router.post(
  "/addProduct",
  authMiddleWare,
  async (req, res) => {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const {
        name,
        description,
        price,
        variants,
        restaurantId: bodyRestaurantId,
        categoryId,
      } = req.body;
      const restaurantId = req.user.restaurantId || bodyRestaurantId;

      if (!name || !restaurantId || !categoryId) {
        return res
          .status(400)
          .json({ message: "Name, restaurantId, and categoryId are required" });
      }

      let parsedVariants = [];
      if (variants) {
        parsedVariants =
          typeof variants === "string" ? JSON.parse(variants) : variants;
      }

      const product = new Product({
        name,
        description: description || "",
        restaurantId,
        categoryId,
        price: price ? Number(price) : undefined,
        variants: Array.isArray(parsedVariants) ? parsedVariants : [],
      });

      await product.save();
      const restaurant = await Restaurant.findById(restaurantId);
      restaurant.products.push(product._id);
      await restaurant.save();
      res.status(201).json({ message: "Product added successfully", product });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  },
);

router.get("/getProducts/:restaurantId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const { restaurantId } = req.params;
    const products = await Product.find({ restaurantId }).sort({
      createdAt: -1,
    }).populate("categoryId", "name");
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.delete("/deleteProduct/:productId", authMiddleWare, async (req, res) => {
  if (req.user.role !== "user") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }


    await Product.findByIdAndDelete(productId);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

router.put(
  "/updateProduct/:productId",
  authMiddleWare,

  async (req, res) => {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const { productId } = req.params;
      const { name, description, price, variants, isAvailable } = req.body;

      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const updateData = {
        name,
        description: description || "",
        price: price ? Number(price) : undefined,
      };

      if (typeof isAvailable !== "undefined") {
        updateData.isAvailable = isAvailable === "true" || isAvailable === true;
      }

      if (variants) {
        const parsedVariants =
          typeof variants === "string" ? JSON.parse(variants) : variants;
        updateData.variants = Array.isArray(parsedVariants)
          ? parsedVariants
          : [];
      }

    
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true },
      );

      res.json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: error.message || "Internal server error" });
    }
  },
);

module.exports = router;