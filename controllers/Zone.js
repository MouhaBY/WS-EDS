var sql = require("mssql");
var config = require("../sql-config");


exports.getmyZones = async (req, res, next) => {
    try {
        console.debug('zone for user : ' + req.params.storeid )
        const pool = await sql.connect(config)
        const request = pool.request();
        request.input('storeid', sql.VarChar, req.params.storeid);
        const result = await request.query`SELECT Z.Id, Z.Name FROM StoresZones SZ JOIN Zones Z ON Z.Id = SZ.ZoneId WHERE (SZ.StoreId = @storeid);`;
        myZones = result.recordset;
        
        // check if zones vides
        if (!myZones.length>0){
            /*check if storeid exists
            if (!orderFound.Actif){
                return res.status(401).json({error : 'storenotfound'});
            }*/
            return res.status(401).json({error : 'emptyZones'});
        }
        
        // Return all informations for zones
        res.status(200).json({
            myZones
        });
    }
    catch (error) {
        console.debug(error)
        res.status(500).json({ error });
    }
}