// set up SQL connection
const config = {
    user: 'sa',
    password: '125',
    server: 'localhost\\SQL14', 
    database: 'EDSdb', 
    options: {
        instanceName: 'SQL14',
        encrypt: false,
        cryptoCredentialsDetails: { minVersion: 'TLSv1' }
    }
}

exports.config