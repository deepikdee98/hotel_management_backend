const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../models/Admin');

const softDeleteModels = ['invoiceModel.js', 'paymentModel.js', 'folioModel.js', 'reservationModel.js', 'guestModel.js'];

function processSchemas() {
    const files = fs.readdirSync(modelsDir);

    for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const fullPath = path.join(modelsDir, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        // Check if mongoose schema is defined
        const schemaRegex = /new\s+mongoose\.Schema\(\s*\{/;
        if (schemaRegex.test(content) && !content.includes('hotelId:')) {
            const hotelIdField = `
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      immutable: true,
      index: true
    },`;
            content = content.replace(schemaRegex, `new mongoose.Schema({${hotelIdField}`);
            modified = true;
        }

        // Add soft delete to specific models
        if (softDeleteModels.includes(file) && !content.includes('isDeleted:')) {
            const softDeleteFields = `
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },`;
            content = content.replace(schemaRegex, `new mongoose.Schema({${softDeleteFields}`);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Updated schema in ${file}`);
        }
    }
}

processSchemas();
console.log('Models migration done.');
