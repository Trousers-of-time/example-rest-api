const express = require('express');
require('dotenv').config()

const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const app = express();

var eventsRouter = require('./routes/api/events');

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


const PORT = process.env.PORT || 8080;

app.use('/api/events', eventsRouter);

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

app.get("/status", (request, response) => {
    const status = {
       status : `Running on port: ${PORT}`
    };
    
    response.send(status);
 });

 app.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!")
  })


  
