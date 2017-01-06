var express = require("express");
var path = require("path");
var mongo = require("mongodb");

var app = express();
app.use(express.static(__dirname + '/views'));
mongo.MongoClient.connect(process.env.MONGOLAB_URI || "mongodb://localhost:27017/url-shortener", function(err, db) {

  if (err) {
    throw new Error('Database failed to connect!');
  } else {
    console.log("Successfully connected to MongoDB on port 27017.");
  }

  db.createCollection("sites", {
    capped: true,
    size: 5242880,
    max: 5000
  });
  
  process.env.APP_URL = "https://url-shortened-longbb.herokuapp.com/";
  
  app.get("/", function(req, res) {
    res.sendFile("index.html");
  });  
  app.get("/:url", redirectURL);
  app.get("/new/:url*", createNewSites);

  function redirectURL(req, res) {
    var url = process.env.APP_URL + req.params.url;
    console.log(url);
    console.log(req.params.url);
    if (url != process.env.APP_URL + "favicon.ico") {
      findURL(url, db, res);
    }
  }

  function createNewSites(req, res) {
    var url = req.url.slice(5);
    console.log(req.url);
    var urlObj = {};
    if (validateURL(url)) {
      urlObj = {
        "original_url": url,
        "short_url": process.env.APP_URL + linkGen()
      };
      res.send(urlObj);
      save(urlObj, db);
    } else {
      urlObj = {
        "error": "Wrong url format, make sure you have a valid protocol and real site."
      };
      res.send(urlObj);
    }
  }

  function linkGen() {
    var num = Math.floor(100000 + Math.random() * 900000);
    return num.toString().substring(0, 4);
  }

  function save(obj, db) {
    var sites = db.collection("sites");
    sites.save(obj, function(err, result) {
      if (err) throw err;
    });
  }

  function findURL(link, db, res) {
    var sites = db.collection("sites");
    sites.findOne({
      "short_url": link
    }, function(err, result) {
      if (err) throw err;
      if (result) {
        res.redirect(result.original_url);
      } else {
        res.send({
          "error": "This url is not on the database."
        });
      }
    });
  }

  function validateURL(url) {
    var regex = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
    return regex.test(url);
  }

  var port = process.env.PORT || 8080;
  app.listen(port, function() {
    console.log("Node.js listening on port " + port);
    console.log(process.env.APP_URL);
  });

});