const User = require('./models/user'); // Import the User model

const LocalStrategy = require('passport-local').Strategy;

exports.initializePassport = (passport) => {

    passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
        try {
            const foundUser = await User.findOne({ username: username }).populate("contacts"); // Use the User model
            if (!foundUser) return done(null, false);
            if (foundUser.password !== password) return done(null, false); // Note: Compare passwords using strict equality !==
            return done(null, foundUser); // Pass foundUser instead of user
        } catch (err) {
            return done(err, false);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id); // Use User.findById
            done(null, user);
        } catch (err) {
            done(err, false);
        }
    });
};


exports.isAuthenticated = (req, res, next) => {
    if (req.user) return next();
    res.redirect('/login');
}


exports.isNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated())return  res.redirect('profile');
     next();
}
