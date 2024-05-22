const mongoose = require('mongoose');


const connectToMongoDB=()=>{
    mongoose.connect(
        "mongodb://localhost:27017/talks"
    ).then(() => {
        console.log("mongodb  connected successfully")
    }).catch(() => {
        console.log("failed to connect")
    })
}

module.exports=connectToMongoDB;

