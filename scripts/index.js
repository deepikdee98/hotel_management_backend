require("dotenv").config();
const mongoose = require("mongoose");

const seedSuperAdmin = require("./seedSuperAdmin");
const seedSetupOptions = require("./seedSetupOptions");
const migrateServiceCodesToServices = require("./migrateServiceCodesToServices");

const uri = process.env.CONNECTION_STRING || "mongodb://127.0.0.1:27017/hotel_management";

const tasks = [
  {
    name: "Seed Super Admin",
    running: "Seeding Super Admin...",
    completed: "Super Admin completed",
    action: seedSuperAdmin,
  },
  {
    name: "Seed Setup Options",
    running: "Seeding Setup Options...",
    completed: "Setup Options completed",
    action: seedSetupOptions,
  },
  {
    name: "Migrate Service Codes -> Services",
    running: "Migrating Services...",
    completed: "Services migration completed",
    action: migrateServiceCodesToServices,
  },
];

function formatResult(result) {
  if (!result) return "";

  const parts = [];
  if (Number.isFinite(result.created)) parts.push(`created: ${result.created}`);
  if (Number.isFinite(result.updated)) parts.push(`updated: ${result.updated}`);
  if (Number.isFinite(result.skipped)) parts.push(`skipped: ${result.skipped}`);
  if (Number.isFinite(result.total)) parts.push(`total: ${result.total}`);

  return parts.length ? ` (${parts.join(", ")})` : "";
}

async function runSetup() {
  console.log("Starting project setup...");
  console.log(`Connecting to MongoDB: ${uri}`);

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    console.log(`\n[${index + 1}/${tasks.length}] ${task.running}`);

    try {
      const result = await task.action();
      if (result?.created === 0 && result?.updated === 0 && result?.skipped > 0) {
        console.log(`[SKIP] ${task.name}${formatResult(result)}`);
      } else {
        console.log(`[OK] ${task.completed}${formatResult(result)}`);
      }
      if (result?.message) {
        console.log(`   ${result.message}`);
      }
    } catch (error) {
      console.error(`[FAIL] ${task.name}`);
      console.error(error);
      throw error;
    }
  }

  console.log("\nProject setup completed successfully");
}

if (require.main === module) {
  runSetup()
    .then(async () => {
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(1);
    });
}

module.exports = runSetup;
