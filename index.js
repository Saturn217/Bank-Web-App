const express = require('express');
const app = express();
const ejs = require('ejs');
const mongoose = require('mongoose');
app.set('view engine', 'ejs');
const dotenv = require('dotenv');
dotenv.config();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const userRouter = require ('./routers/user.routes') 
const accountRouter = require('./routers/account.routes')
const transactionRouter = require('./routers/transactionHistory.routes')
app.use('/api/v1', userRouter, accountRouter, transactionRouter);



mongoose.connect(process.env.DATABASE_URI)
.then(()=>{
    console.log('Database connected Successfully');
    
})
.catch(err => {
    console.log("Error connecting to Database", err);
    
})






















app.listen(process.env.PORT, (err) => {   // this is the line of code that starts the server and listens for incoming requests on the specified port. The port number is taken from the environment variable PORT, which should be defined in the .env file. The callback function is executed when the server starts successfully or if there is an error starting the server. If there is an error, it will log "error starting server" to the console, otherwise it will log "server started successfully".
    if (err) {
        console.log('error starting server');
    }   
    else {
        console.log('server started successfully');

    }

})