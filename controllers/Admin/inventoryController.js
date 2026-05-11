const asyncHandler = require("express-async-handler");
const Inventory = require("../../models/Admin/inventoryModel");

// @desc    Get all inventory items
// @route   GET /admin/inventory
// @access  Private
const getInventory = asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId };
  if (req.query.category && req.query.category !== "All") {
    filter.category = req.query.category;
  }
  if (req.query.search) {
    filter.name = { $regex: req.query.search, $options: "i" };
  }

  const inventory = await Inventory.find(filter).sort({ name: 1 });
  res.json({ success: true, data: inventory });
});

// @desc    Add new inventory item
// @route   POST /admin/inventory
// @access  Private
const createInventoryItem = asyncHandler(async (req, res) => {
  const { name, category, quantity, unit, minStock } = req.body;

  const item = await Inventory.create({
    hotelId: req.user.hotelId,
    name,
    category,
    quantity,
    unit,
    minStock,
    lastUpdatedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: item });
});

// @desc    Update inventory item
// @route   PATCH /admin/inventory/:id
// @access  Private
const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findOne({ _id: req.params.id, hotelId: req.user.hotelId });

  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  const updatedItem = await Inventory.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
    { ...req.body, lastUpdatedBy: req.user._id },
    { new: true }
  );

  res.json({ success: true, data: updatedItem });
});

// @desc    Delete inventory item
// @route   DELETE /admin/inventory/:id
// @access  Private
const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findOne({ _id: req.params.id, hotelId: req.user.hotelId });

  if (!item) {
    res.status(404);
    throw new Error("Inventory item not found");
  }

  await item.deleteOne();
  res.json({ success: true, message: "Item removed" });
});

module.exports = {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};
