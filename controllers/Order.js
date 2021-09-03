var sql = require("mssql");
var config = require("../sql-config");


exports.getOrder = async (req, res, next) => {
    try {
        console.debug('order barcode : ' + req.params.barcode )
        const pool = await sql.connect(config)
        const request = pool.request();
        request.input('orderbarcode', sql.VarChar, req.params.barcode);
        const result = await request.query`SELECT TOP 1 O.Id, O.OrderNumber, O.TrackingNumber, O.GoodsNatureId, O.CollectAddressFullName, O.CollectAddress, O.CollectAddressPhone, O.DeliveryAddressFullName, O.DeliveryAddress, O.DeliveryAddressPhone, C.Name AS CustomerName, O.WithHomeCollect, O.WithHomeDelivery, O.WithCOD, O.AmountCOD, Sf.Name AS FromStore, St.Name AS ToStore, DS.Name AS DSName, DSR.Name AS DSRName, OS.StoreId, OS.UserId, O.Actif FROM Orders O JOIN Stores Sf ON Sf.Id = O.FromStoreId JOIN Stores St ON St.Id = O.ToStoreId JOIN OrdersStates OS ON OS.OrderId = O.Id JOIN DeliveryStates DS ON DS.Id = OS.DeliveryStateId JOIN DeliveryStatesReasons DSR ON DSR.Id = OS.DeliveryStateReasonId JOIN Customers C ON C.Id = O.CustomerId WHERE (O.Barcode = @orderbarcode);`;
        const orderFound = result.recordset[0];
        
        // check if order found
        if (!orderFound){
            return res.status(401).json({error : 'OrderNotRecognized'});
        }
        //check if order actif
        if (!orderFound.Actif){
            return res.status(401).json({error : 'OrderNotActif'});
        }
        //Get orderNature
        if(orderFound.GoodsNatureId){
            request.input('goodsnatureid', sql.VarChar, orderFound.GoodsNatureId);
            const result = await request.query`SELECT TOP 1 Name AS GoodsNature FROM GoodsNature WHERE (Id = @goodsnatureid);`; 
            var GoodsNature = result.recordset[0].GoodsNature;
        }
        //Get Store / User
        if(orderFound.StoreId){
            request.input('storeid', sql.VarChar, orderFound.StoreId);
            const result = await request.query`SELECT TOP 1 Name AS StoreName FROM Stores WHERE (Id = @storeid);`; 
            var StoreName = result.recordset[0].StoreName;
        }
        if(orderFound.UserId){
            request.input('userid', sql.VarChar, orderFound.UserId);
            const result = await request.query`SELECT TOP 1 Username FROM Users WHERE (Id = @userid);`;
            var Username = result.recordset[0].Username;
        }
        
        // Return all informations for parcel
        res.status(200).json({
            parcelData : {
                Id: orderFound.Id,
                Barcode: req.params.barcode,
                OrderNumber:orderFound.OrderNumber,
                FromStore: orderFound.FromStore,
                ToStore: orderFound.ToStore,
                OrderStatus: orderFound.DSName,
                OrderStatusReason:orderFound.DSRName,
                State:{StoreName:StoreName, Username:Username},
                GoodsNature: GoodsNature,
                CustomerName: orderFound.CustomerName,
                TrackingNumber : orderFound.TrackingNumber,
                WithHomeDelivery: orderFound.WithHomeDelivery,
                WithHomeCollect: orderFound.WithHomeCollect,
                WithCOD:orderFound.WithCOD,
                AmountCOD:orderFound.AmountCOD,
                CollectAddressFullName: orderFound.CollectAddressFullName,
                CollectAddress: orderFound.CollectAddress,
                CollectAddressPhone: orderFound.CollectAddressPhone,
                DeliveryAddressFullName: orderFound.DeliveryAddressFullName,
                DeliveryAddress: orderFound.DeliveryAddress,
                DeliveryAddressPhone: orderFound.DeliveryAddressPhone,
            }
        });
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}

exports.getOrdersToCollectByStore = async (req, res, next) => {
    try {
        console.debug('order zone to collect : ' + req.params.storeid );
        const pool = await sql.connect(config);
        const request = pool.request();
        request.input('storeid', sql.VarChar, req.params.storeid);
        var result = await request.query`SELECT O.Id, O.OrderNumber, O.CollectAddressFullName, O.CollectAddress, O.CollectAddressPhone, Z.Id AS ZoneId, Z.Name AS ZoneName FROM Orders O JOIN Zones Z ON Z.Id = O.HomeCollectZoneId JOIN OrdersStates OS ON OS.OrderId = O.Id JOIN StoresZones SZ ON O.HomeCollectZoneId = SZ.ZoneId WHERE (O.WithHomeCollect = 'True' AND OS.DeliveryStateId = 0 AND O.Actif = 'True' AND SZ.StoreId = @storeid);`;
        //ajouter le control sur la date de collecte
        const myOrders = result.recordset;
        // check if orders found
        if (!myOrders){
            return res.status(401).json({error : 'emptyList'});
        }
        const myZones = [];
        const map = new Map();
        for (const item of myOrders) {
            if(!map.has(item.ZoneId)){
                map.set(item.ZoneId, true);
                myZones.push({
                    Id: item.ZoneId,
                    Name: item.ZoneName
                });
            }
        }

        // Return all informations for parcel
        res.status(200).json({
            myOrders,
            myZones
        })
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}

exports.collectOrder = async (req, res, next) => {
    try {
        console.debug('order to collect : ' + req.body.orderBarcode );
        const pool = await sql.connect(config);
        const request = pool.request();
        request.input('orderbarcode', sql.VarChar, req.body.orderBarcode);
        var result = await request.query`SELECT TOP 1 O.Id, O.OrderNumber, O.Description, O.GoodsNatureId, O.HomeCollectZoneId, O.WithHomeCollect, OS.DeliveryStateId, OS.DeliveryStateReasonId, SZ.StoreId, O.Actif FROM Orders O JOIN OrdersStates OS ON OS.OrderId = O.Id JOIN StoresZones SZ ON O.HomeCollectZoneId = SZ.ZoneId WHERE ( O.Barcode = @orderbarcode );`;
        //ajouter le control sur la date de collecte
        const orderToCollect = result.recordset[0];
        // check if orders found
        if (!orderToCollect){
            return res.status(401).json({error : 'OrderNotRecognized'});
        }
        //check if order actif
        if (!orderToCollect.Actif){
            return res.status(401).json({error : 'OrderNotActif'});
        }
        //check if order to collect
        if (!orderToCollect.WithHomeCollect || orderToCollect.DeliveryStateId != '0' || orderToCollect.DeliveryStateReasonId !='0'){
            return res.status(401).json({error : 'OrderNotToCollect'});
        }
        //check if order in this store
        if (orderToCollect.StoreId != req.body.storeId){
            return res.status(401).json({error : 'OrderNotInThisStore'});
        }
        //Get orderNature
        if(orderToCollect.GoodsNatureId){
            request.input('goodsnatureid', sql.VarChar, orderToCollect.GoodsNatureId);
            const result = await request.query`SELECT TOP 1 Name AS GoodsNature FROM GoodsNature WHERE (Id = @goodsnatureid);`; 
            var GoodsNature = result.recordset[0].GoodsNature;
        }
        
        //Setting time
        var pad = function(num) { return ('00' + num).slice(-2) };
        var date;
        date = new Date();
        date = date.getUTCFullYear() + '-' +
        pad(date.getUTCMonth() + 1)  + '-' +
        pad(date.getUTCDate())       + ' ' +
        pad(date.getUTCHours())      + ':' +
        pad(date.getUTCMinutes())    + ':' +
        pad(date.getUTCSeconds());
        request.input('dateNow', sql.DateTime, date);

        //Update Order Status
        request.input('orderid', sql.VarChar, orderToCollect.Id);
        request.input('userid', sql.VarChar, req.body.userId);
        await request.query`UPDATE OrdersStates SET DeliveryStateId = '10', StoreId=NULL, UserId=@userid WHERE (OrderId = @orderid);`;

        //Insert into Tracking
        await request.query`INSERT INTO OrdersTracking (OrderId, OrderDeliveryStateId, OrderDeliveryStateReasonId, ActionOn, ActionBy, Location) VALUES (@orderid, '10', '0', @dateNow, @userid, 'Livreur') ;`;

        // Return all informations for parcel
        res.status(200).json({
            collectedOrder:{
                Id:          orderToCollect.Id,
                OrderNumber: orderToCollect.OrderNumber,
                GoodsNature: GoodsNature,
                Description: orderToCollect.Description
            }
        })
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}