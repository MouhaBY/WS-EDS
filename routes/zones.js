const express = require('express');
const router = express.Router();
const zoneCtrl = require('../controllers/Zone');
const auth = require('../middlewares/auth');

router.get('/:storeid', zoneCtrl.getStoreZones);

module.exports = router;