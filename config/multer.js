const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory temporarily

module.exports = upload;
