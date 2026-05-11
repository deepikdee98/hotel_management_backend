const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // skip SuperAdmin directories
            if (file === 'SuperAdmin') continue;
            processDirectory(fullPath);
        } else if (file.endsWith('.js')) {
            // avoid authController which operates on User and SuperAdmin
            if (file === 'authController.js') continue;

            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Simple regex to replace Model.findById(id) -> Model.findOne({ _id: id, hotelId: req.user.hotelId })
            // We'll replace it with a more robust regex that handles standard patterns.
            
            // 1. replace findById(id) -> findOne({ _id: id, hotelId: req.user.hotelId })
            const findByIdRegex = /\.findById\(\s*([^,\)]+)\s*\)/g;
            if (findByIdRegex.test(content)) {
                content = content.replace(findByIdRegex, '.findOne({ _id: $1, hotelId: req.user.hotelId })');
                modified = true;
            }

            // 2. replace findByIdAndUpdate(id, data, options) -> findOneAndUpdate({ _id: id, hotelId: req.user.hotelId }, data, options)
            const findByIdAndUpdateRegex = /\.findByIdAndUpdate\(\s*([^,\)]+)\s*,/g;
            if (findByIdAndUpdateRegex.test(content)) {
                content = content.replace(findByIdAndUpdateRegex, '.findOneAndUpdate({ _id: $1, hotelId: req.user.hotelId },');
                modified = true;
            }

            // 3. replace findByIdAndDelete(id) -> findOneAndDelete({ _id: id, hotelId: req.user.hotelId })
            const findByIdAndDeleteRegex = /\.findByIdAndDelete\(\s*([^,\)]+)\s*\)/g;
            if (findByIdAndDeleteRegex.test(content)) {
                content = content.replace(findByIdAndDeleteRegex, '.findOneAndDelete({ _id: $1, hotelId: req.user.hotelId })');
                modified = true;
            }
            
            // 4. remove req.body.hotelId = ... or using req.body.hotelId manually
            const reqBodyHotelIdRegex = /req\.body\.hotelId\s*=\s*[^;]+;/g;
            if (reqBodyHotelIdRegex.test(content)) {
                content = content.replace(reqBodyHotelIdRegex, '');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDirectory(controllersDir);
console.log('Controllers migration done.');
