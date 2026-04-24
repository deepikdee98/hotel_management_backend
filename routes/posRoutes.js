const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeModule } = require("../middleware/moduleMiddleware");

const Folio = require("../models/Admin/folioModel");
const PosItem = require("../models/Admin/posItemModel");
const PosOrder = require("../models/Admin/posOrderModel");
const FolioTransaction = require("../models/Admin/folioTransactionModel");

const toNum = (v) => Number(v || 0);

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"), authorizeModule("point-of-sale"));

router.route("/items")
  .get(asyncHandler(async (req, res) => {
    const items = await PosItem.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
    res.json({ success: true, data: { items } });
  }))
  .post(asyncHandler(async (req, res) => {
    const item = await PosItem.create({ ...req.body, hotelId: req.user.hotelId });
    res.status(201).json({ success: true, data: item });
  }));

router.route("/items/:id")
  .patch(asyncHandler(async (req, res) => {
    const item = await PosItem.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      req.body,
      { new: true }
    );
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.json({ success: true, data: item });
  }))
  .delete(asyncHandler(async (req, res) => {
    const item = await PosItem.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.json({ success: true, message: "Item deleted successfully" });
  }));

router.get("/orders", asyncHandler(async (req, res) => {
  const orders = await PosOrder.find({ hotelId: req.user.hotelId })
    .populate("folioId", "folioNumber guestName")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { orders } });
}));

router.post("/orders", asyncHandler(async (req, res) => {
  const payloadItems = Array.isArray(req.body.items) ? req.body.items : [];
  const items = [];

  for (const row of payloadItems) {
    const item = await PosItem.findOne({ _id: row.itemId, hotelId: req.user.hotelId });
    if (!item) {
      continue;
    }

    const quantity = toNum(row.quantity || 1);
    const unitPrice = toNum(row.unitPrice || item.price);
    const amount = quantity * unitPrice;
    const taxRate = toNum(row.taxRate || item.taxRate || 0);
    const taxAmount = Number(((amount * taxRate) / 100).toFixed(2));

    items.push({
      itemId: item._id,
      name: item.name,
      quantity,
      unitPrice,
      taxRate,
      amount,
      taxAmount,
      total: amount + taxAmount,
    });
  }

  if (!items.length) {
    return res.status(400).json({ success: false, message: "At least one valid item is required" });
  }

  const subTotal = items.reduce((sum, i) => sum + i.amount, 0);
  const taxTotal = items.reduce((sum, i) => sum + i.taxAmount, 0);
  const grandTotal = subTotal + taxTotal;

  const order = await PosOrder.create({
    hotelId: req.user.hotelId,
    orderNumber: `POS-${Date.now()}`,
    folioId: req.body.folioId || null,
    tableNo: req.body.tableNo,
    status: req.body.status || "open",
    items,
    subTotal,
    taxTotal,
    grandTotal,
    createdBy: req.user._id,
  });

  if (order.folioId) {
    const folio = await Folio.findOne({ _id: order.folioId, hotelId: req.user.hotelId });
    if (folio) {
    await FolioTransaction.create({
      hotelId: req.user.hotelId,
      folioId: folio._id,
      checkin: folio.checkinId,
      type: "service-charge",
      description: `POS Order ${order.orderNumber}`,
      amount: subTotal,
      taxAmount: taxTotal,
      totalAmount: grandTotal,
      meta: { posOrderId: order._id },
    });
    }
  }

  res.status(201).json({ success: true, data: order });
}));

router.get("/orders/:id", asyncHandler(async (req, res) => {
  const order = await PosOrder.findOne({ _id: req.params.id, hotelId: req.user.hotelId });
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  res.json({ success: true, data: order });
}));

router.patch("/orders/:id/status", asyncHandler(async (req, res) => {
  const order = await PosOrder.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.user.hotelId },
    { status: req.body.status },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.json({ success: true, data: order });
}));

router.post("/orders/:id/payment", asyncHandler(async (req, res) => {
  const order = await PosOrder.findOne({ _id: req.params.id, hotelId: req.user.hotelId });
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  const amount = toNum(req.body.amount);
  order.paidAmount = Number((toNum(order.paidAmount) + amount).toFixed(2));
  order.paymentMode = req.body.paymentMode || order.paymentMode;
  if (order.paidAmount >= order.grandTotal) {
    order.status = "closed";
  }
  await order.save();

  res.json({ success: true, data: order });
}));

module.exports = router;
