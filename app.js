var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var compression = require('compression');
var helmet = require('helmet');
var sql = require("mssql");
//const config = require('./sql-config')

var usersRouter = require('./routes/users');
var ordersRouter = require('./routes/orders');
var zonesRouter = require('./routes/zones');

var app = express();
app.use(helmet());

//Set up SQL connection
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

pool = sql.connect(config).then(() => console.log('Connexion à SQL réussie !')).catch(() => console.log('Connexion à SQL échouée !'))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression()); //Compress all routes
app.use(express.static(path.join(__dirname, 'public')));

// defining routes
app.use('/users', usersRouter);
app.use('/orders', ordersRouter);
app.use('/zones', zonesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
