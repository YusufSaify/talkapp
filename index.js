const path = require('path');
const express = require('express');
const app = express();
const http = require('http');
const ejs = require('ejs');
const connecttDB = require('./mongoDB');
const passport = require('passport');
const { initializePassport, isAuthenticated, isNotAuthenticated } = require('./passportConfig');
const expressSession = require('express-session');



const user = require('./models/user')
const Message = require('./models/message')

initializePassport(passport);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', "ejs");
app.use(expressSession({ secret: "yusuf is great", resave: false, saveUninitialized: false }))
app.use(passport.initialize());
app.use(passport.session());

const { Server } = require('socket.io');
const User = require('./models/user');

const server = http.createServer(app);
const io = require('socket.io')(server);
app.set("view engine", 'ejs');
// const __dirname=path.resolve();
app.set(express.static(__dirname, + 'public'));


connecttDB();

const onlineUsers = new Map();

io.on('connection', (socket) => {



    socket.on('online', async (obj) => {
        const userfound = await user.findOne({ username: obj.username });
        if (!userfound) return;
        userfound.socketid = obj.id;
        userfound.status = true;
        userfound.save();
        onlineUsers.set(socket.id, obj.username);
    })


    socket.on('disconnect', async () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            const userfound = await user.findOne({ username: username });
            if (userfound) {
                userfound.status = false;
                userfound.save();
            } else {
            }
            onlineUsers.delete(socket.id);
        }
    });



    socket.on('sendToSocket', async ({ sendersid, recipientusername, message }) => {

        try {
            const recipient = await user.findOne({ username: recipientusername });
            if (!recipient) {
                console.error(`Recipient with username ${recipientusername} not found`);
                return;
            }
            console.log("rec: " + recipient.username);

            // Check if the senderId is already present in the recipient's contacts
            if (recipient.contacts.includes(sendersid)) {
                // If senderId is already present, remove it from the contacts array
                recipient.contacts.pull(sendersid);
            }

            // Add senderId to the beginning of the contacts array
            recipient.contacts.unshift(sendersid);

            // Save the updated recipient document
            await recipient.save();

            const sender = await user.findOne({ _id: sendersid });
            if (!sender) {
                console.error(`Sender with ID ${sendersid} not found`);
                return;
            }
            console.log("send: " + sender.username);


            if (sender.contacts.includes(recipient._id) && recipient._id.toString() !== sendersid.toString()) {
                // If recipient's ID is already present, remove it from the contacts array
                sender.contacts.pull(recipient._id);
            }

            // Add recipient's ID to the beginning of the sender's contacts array.
            sender.contacts.unshift(recipient._id);

            // Save the updated sender document.
            await sender.save();

            // Emit the message to the recipient's socket.
            if (recipient.status == true) {
                io.to(recipient.socketid).emit('message', { content: message, from: sendersid });
            }

            // Create and save the message document.
            const msg = await Message.create({
                content: message,
                from: sendersid,
                to: recipient._id,
                status: false
            });
            await msg.save();

            console.log("Message sent successfully");
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });

    // Event listener for fetching conversations
    socket.on('fetchConversations', async ({ currentUser, otherUser }) => {
        try {
            // Retrieve messages exchanged between the two users
            const messages = await Message.find({
                $or: [
                    { from: currentUser, to: otherUser },
                    { from: otherUser, to: currentUser }
                ]
            }).populate('from to');
            // //console.log(messages);

            // Send the retrieved messages back to the client
            socket.emit('conversationsFetched', { messages: messages });
        } catch (error) {
            //console.error('Error fetching conversations:', error);
            // Handle error (e.g., emit an error event to the client)
        }
    });



    socket.on('getnewdata', async (id) => {
        const founduser = await user.findOne({ _id: id });
        console.log(founduser)
        if (founduser) {
            socket.emit('takenewdata', { user: founduser });
        }

    })






    socket.on('privateMessage', ({ username, toUserName, message }) => {
        const toUserSocket = onlineUsers[toUserName];
        if (toUserSocket) {
            io.to(toUserSocket).emit('privateMessage', {
                fromusername: username,
                message: message,
            });
        }
    });

    socket.on('sendMsgReadAck',async  ({touser, fromuser}) => {
        const user=await User.findOne({_id:touser});
        if(!user)return;
        io.to(user.socketid).emit('getMsgReadAck',{user:fromuser});
        console.log(" msg  from : " + touser + "read by " + fromuser)
    })


});

app.get('/searchusername/:username', async (req, res) => {

    const regex = RegExp(`^${req.params.username}`, 'i');
    const users = await user.find({ username: regex });
    res.json(users);
})


app.get('/getcontactdetail/:contactid/:userid', async (req, res) => {
    const contactid = req.params.contactid;
    const userid = req.params.userid;

    const contact = await user.findOne({ _id: contactid });

    const lastconv = await Message.findOne({
        $or: [
            { from: userid, to: contactid },
            { from: contactid, to: userid }
        ]
    }).sort({ timestamp: -1 });

    const unreadmsg = await Message.find({
        $and: [
            { from: contactid }, // Messages are from the specified user ID
            { to: userid },
            { read: false }, // Messages are marked as unread
            // {to:req.user._id}
        ]
    })


    if (contact) {
        const contactdetails = {
            "username": contact.username,
            "lastconv": lastconv ? lastconv : { "content": "no msg yet  " },
            "unreadmsg": unreadmsg.length,
            "socketid": contact.socketid,
            "status": contact.status,
            "_id": contact._id
        }
        res.json(contactdetails);
    }
})
// JUST COMPLETED

// Assessment
// Coding Test - 2024 Batch - 4

// Time Taken
// 16 minutes 08 seconds

// Submitted On
// 20 May, 2024 11:31 AM

// Candidate ID
// 42549088




app.get('/readmessages/:fromuserid/:touserid', async (req, res) => {

    const messages = await Message.find({
        $and: [
            { from: req.params.fromuserid }, // Messages are from the specified user ID
            { to: req.params.touserid },
            { read: false }, // Messages are marked as unread
        ]
    });
    const fromuser = await User.findOne({ _id: req.params.fromuserid });
    if (fromuser) {
        io.to(fromuser.socketid).emit("updatereadmsg", { msgs: messages });
    }

    messages.forEach((msg) => {
        msg.read = true;
        msg.save();
        console.log("message has been readed "+msg.content)
    })
})


app.get('/deletechat/:fromid/:toid', async (req, res) => {
    const messages = await Message.find({
        $and: [
            { from: req.params.toid }, // Messages are from the specified user ID
            { to: req.params.fromid },
        ]
    });
    messages.forEach(async (msg) => {
        await Message.findOneAndDelete({ _id: msg._id });
    })

})



app.get('/login', isNotAuthenticated, function (req, res) {
    res.render('login', { error: "" });
})

app.get('/signup', isNotAuthenticated, function (req, res) {
    res.render("signup", { error: "" });
})

app.post('/signup', async (req, res) => {

    const userExist = await user.findOne({ username: req.body.username });
    if (userExist) {
        return res.render('signup', { error: [{ msg: 'User already exists with that username' }] });
    }

    try {
        const newuser = await user.create({
            username: req.body.username,
            fullname: req.body.fullname,
            password: req.body.password
        });
        // Respond with success message or redirect to another page
        res.status(200).redirect('/login');
    } catch (error) {
        //console.error(error); // Log the error for debugging
        res.status(500).json("Server problem");
    }
});

app.post('/login', passport.authenticate('local'), (req, res) => {
    res.redirect('/profile');
});
app.get('/profile', isAuthenticated, (req, res) => {
    // console.log(req.user);
    res.render('home', { user: req.user });
})
app.get('/getuserdetails/:userid', async (req, res) => {
    try {
        const userfound = await user.findOne({ _id: req.params.userid });
        // console.log("user : "+userfound);
        res.json(userfound);
    } catch (err) {
        res.send(err);
    }
})

app.get('/chat', isAuthenticated, (req, res) => {
    res.send('Auth done!');
})


app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/login');
    });
});
server.listen(process.env.PORT, () => console.log("server started"))


