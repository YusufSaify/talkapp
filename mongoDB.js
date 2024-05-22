const mongoose = require('mongoose');


const connectToMongoDB=()=>{
    mongoose.connect(
        process.env.MONGO_URL
    ).then(() => {
        console.log("mongodb  connected successfully")
    }).catch(() => {
        console.log("failed to connect")
    })
}

module.exports=connectToMongoDB;

