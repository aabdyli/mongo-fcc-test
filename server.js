const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track");
mongoose.Promise = require("bluebird");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [
    {
      description: String,
      duration: Number,
      date: { type: Date, default: Date.now() }
    }
  ]
});

const User = mongoose.model("User", userSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", (req, res) => {
  const user = new User(req.body);

  user.save();
  res.json({ _id: user._id, username: user.username });
});

app.post("/api/exercise/add", function(req, res, next) {
  const { duration, description, date } = req.body;
  const validDate = Date.parse(date) ? date : new Date();
  User.findByIdAndUpdate(
    req.body.userId,
    {
      $push: {
        log: { duration: duration, description: description, date: validDate }
      }
    },
    (err, user) => {
      if (err) {
        err.message = "unknown _id";
        return next(err);
      }
      res.json({
        username: user.username,
        description: description,
        _id: user._id,
        duration: duration,
        date: new Date(validDate).toDateString()
      });
    }
  );
});

app.get("/api/exercise/log", (req, res, next) => {
  let { userId, from, to, limit } = req.query;
  if (!userId) {
    return next({message: "unknown _id"});
  }
  User.findById(userId, (err, data) => {
    if (err) {
      err.message = "unknown _id";
      return next(err);
    }
    let log = data.log
    
    if(from) {
      log = log.filter(el =>  Date.parse(el) >= Date.parse(from))
    }
    
    if(to) {
      log = log.filter(el =>  Date.parse(el) >= Date.parse(to))
    }
    
    if(limit) {
      log = log.filter((el, idx) => idx < limit)
    }
    
    res.json({
      _id: data._id,
      username: data.username,
      count: log.length,
      log: log
    })
  });
  // res.json(req.query);
});
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
