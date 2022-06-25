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


// ROUTES

app.get("/", function(req, res) {
  res.render("home");
});





app.post("/", function(req, res) {
  
  if(req.body.newItem === "" || req.body.listName === "") {    // This condition accounts for when the input field is left blank and the form is submitted.
    res.render("error");
  } else {
    if(req.body.newItem === undefined) {     // Got to be careful while checking whether something equals null/undefined.
      if(req.body.listName.trim() === "") {    // This condition accounts for when the input field has only spaces and the form is submitted.
        res.render("error");
      } else {
        const customListName = req.body.listName; // listName comes from home.ejs
        res.redirect("/" + customListName); 
      } 
    } 
    if(req.body.listName === undefined) {
      if(req.body.newItem.trim() === "") {
        res.render("error");
      } else {
        const itemName = req.body.newItem;     // newItem comes from list.ejs 3rd <form>
        const listName = req.body.list;   // list comes from list.ejs 3rd <form>
        const item = new Item ({
          name: itemName
        });
        List.findOne({name: listName}, function(err, foundList){
          if(err) {
            console.log(err);
          } else {
            foundList.items.push(item);
            foundList.save();
            res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
          }
        });
      }
    }
  }
});





app.listen(3000, function() {
  console.log("Server listening on PORT 3000!");
});