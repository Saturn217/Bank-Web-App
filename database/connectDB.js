// const mongoose = require("mongoose")

// let connectionPromise = null

// const connectDB= async()=>{
//     if(mongoose.connection.readyState ===1) return

//     if (connectionPromise) return connectionPromise

//     connectionPromise = mongoose
//     .connect(process.env.DATABASE_URI)
//     .then(()=>{
//         console.log("Database connected successfully");
        
//     })
//     .catch((err)=>{
//         connectionPromise=null;
//         console.log(err);
//         throw err;
        
//     })

//     return connectionPromise
// }

// module.exports= connectDB



// //0 ->disconnected
// //1 ->connected
// //2->connecting
// //3 ->disconnecting

const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
  // If already connected → reuse
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connection is in progress → wait for it
  if (mongoose.connection.readyState === 2) {
    return connectionPromise;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.DATABASE_URI, {
        bufferCommands: false, // 👈 prevents buffering timeout
        serverSelectionTimeoutMS: 30000, // 👈 safer for Vercel cold starts
      })
      .then((mongooseInstance) => {
        console.log("Database connected successfully");
        return mongooseInstance;
      })
      .catch((err) => {
        connectionPromise = null;
        console.error("MongoDB connection error:", err);
        throw err; // 👈 fixed
      });
  }

  return connectionPromise;
};

module.exports = connectDB;