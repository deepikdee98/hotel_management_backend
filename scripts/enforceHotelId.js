const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../models/Admin');

function enforceHotelIdRules() {
    const files = fs.readdirSync(modelsDir);

    for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const fullPath = path.join(modelsDir, file);
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        // Try to find an existing hotelId block
        // hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true }
        
        // Simpler approach: find "hotelId:" and replace its block, OR
        // just append immutable: true and index: true if missing but hotelId is there.
        
        // We'll replace the entire `hotelId: { ... }` object or just search for `hotelId` and make sure it has immutable and index.
        const regex = /hotelId\s*:\s*\{([^}]*)\}/;
        const match = content.match(regex);
        if (match) {
            let inner = match[1];
            let changed = false;
            if (!inner.includes('immutable')) {
                inner += ', immutable: true';
                changed = true;
            }
            if (!inner.includes('index')) {
                inner += ', index: true';
                changed = true;
            }
            if (!inner.includes('required')) {
                inner += ', required: true';
                changed = true;
            }
            
            if (changed) {
                content = content.replace(regex, `hotelId: {${inner}}`);
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Enforced hotelId rules in ${file}`);
        }
    }
}

enforceHotelIdRules();
console.log('HotelId rules enforced.');
