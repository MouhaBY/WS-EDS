const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/Order');
const auth = require('../middlewares/auth');

router.get('/control/:barcode', orderCtrl.getOrder);
router.get('/myorderstocollect/zone/:zoneid', orderCtrl.getmyOrdersToCollectByZone);
router.get('/myorderstocollect/store/:storeid', orderCtrl.getmyOrdersToCollectByStore);

module.exports = router;