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

mongoose.connect("mongodb://localhost:27017/frigoDB", {useNewUrlParser: true});


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


app.get("/:customListName", function(req, res) {
  
  const customListName = _.capitalize(req.params.customListName);

  if(customListName === "Lists") {     // This condition handles the rendering of all the lists.
    List.find({}, function(err, foundLists) {   // foundLists is an array of objects. This query returns all the list objects.
      if(err) {
        console.log(err);
      } else {
        const array = [];
        for(const list of foundLists) {
          array.push(list.name);
        }
        const distinctLists = [...new Set(array)];   // ES6-specific way of removing duplicate items in an array.
        res.render("lists", {listsArray: distinctLists});
      }
    });
  } else {       // The else part handles the saving of the list
    List.findOne({name: customListName}, function(err, foundList) {   // foundList gives you a matched object with 'name' & 'items' as properties.
      if(err) {
        console.log(err);
      } else {
        if(foundList === null) {      // This condition accounts for when the list doesn't exist. Got to be careful while checking whether something equals null/undefined.
          
          /////// MongoDB takes a lot of time to create only the first entry during which multiple...
          /////// ... redirects happen and this specific code is run, creating multiple entries.
          
          const list = new List({
            name: customListName,
            items: defaultItems
          });
          list.save();
          res.redirect("/limbo/" + customListName);

        } else {
          res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
        }
      }
    });
  }
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