const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();



const app = express();
app.use(cors());
app.use(express.json());
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const waiterRoutes = require("./routes/waiterRoutes");
const orderRoutes = require("./routes/orderRoutes");



const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("Restaurant-Management Backend is Live!");
});
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/waiters", waiterRoutes);
app.use("/api/orders", orderRoutes);



const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};
connectDB().then(() => {
 console.log("Connected to MongoDB, starting server...");
 

  app.listen(PORT, () => {
    console.log(`Server Running on PORT ${PORT}`);
  });
});
