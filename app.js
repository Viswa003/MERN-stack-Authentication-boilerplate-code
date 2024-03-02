require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema ({
  username: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Define the middleware function to check if a user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.sendFile(__dirname + "/views/login.html");
  }
}

app.get("/", function(req, res){
  res.sendFile(__dirname + "/views/login.html");
});

app.get("/login", function(req, res){
  res.sendFile(__dirname + "/views/login.html");
});

app.get("/signup", function(req, res){
  res.sendFile(__dirname + "/views/signup.html");
});

app.get("/authPage", ensureAuthenticated, function(req, res){
  res.sendFile(__dirname + "/views/authPage.html");
});

app.get("/submit", ensureAuthenticated, function(req, res){
  res.sendFile(__dirname + "/views/submit.html");
});

app.post("/submit", ensureAuthenticated, function(req, res){
  const submittedSecret = req.body.secret;

  User.findById(req.user.id)
    .then(foundUser => {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        return foundUser.save();
      }
    })
    .then(() => {
      res.sendFile(__dirname + "/views/authPage.html");
    })
    .catch(err => {
      console.error(err);
      res.sendFile(__dirname + "/views/error.html"); // Redirect to an error page or handle the error as needed
    });
});

app.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) {
      console.error(err);
    }
    res.sendFile(__dirname + "/views/login.html");
  });
});

app.post("/signup", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.error(err);
      return res.sendFile(__dirname + "/views/signup.html"); // Redirect to the signup page or handle the error as needed
    }
    passport.authenticate("local")(req, res, function(){
      res.sendFile(__dirname + "/views/authPage.html");
    });
  });
});

// Use passport.authenticate as middleware for login route
app.post("/login", passport.authenticate("local", {
  successRedirect: "/authPage",
  failureRedirect: "/login"
}));

app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
