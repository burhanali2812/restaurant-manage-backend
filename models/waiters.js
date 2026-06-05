const mongoose = require("mongoose");

const waiterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true,
  },
});

module.exports = mongoose.model("Waiter", waiterSchema);