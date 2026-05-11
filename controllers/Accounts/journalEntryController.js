const asyncHandler = require("express-async-handler");

const JournalEntry = require("../../models/Admin/journalEntryModel");
const { requireTenant, getBusinessId, paginate, nextNumber } = require("../../services/accountsService");
const { requireFields, validateBalancedJournal } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listJournalEntries = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(JournalEntry, tenantFilter(req, "date", search(req.query.search, ["journalNumber", "narration", "reference"])), req.query, { sort: { date: -1 } });
  res.json({ success: true, data: { journalEntries: items, pagination } });
});

exports.createJournalEntry = asyncHandler(async (req, res) => {
  requireFields(req.body, ["narration", "lines"]);
  validateBalancedJournal(req.body.lines);
  const hotelId = requireTenant(req);
  const journal = await JournalEntry.create({ ...req.body, hotelId, businessId: getBusinessId(req), journalNumber: req.body.journalNumber || await nextNumber(hotelId, "JRN-"), createdBy: req.user._id, postedBy: req.user._id, postedAt: new Date() });
  res.status(201).json({ success: true, data: journal });
});
