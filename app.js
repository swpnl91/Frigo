const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const https = require("https");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/inventoryDB", {useNewUrlParser: true});

// Creating schemas and collections for DB

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const defaultItems = [];  // Creating an empty array so that it can be assigned to 'items' property of the newly created List and it won't have its value as null.

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

const pantrySchema = new mongoose.Schema({
  name: String
});

const Pantry = mongoose.model("Pantry", pantrySchema);

app.get("/", function(req, res) {
  res.render("home");
});





app.post("/", function(req, res) {

});





app.listen(3000, function() {
  console.log("Server listening on PORT 3000!");
});