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

app.get("/pantry", function(req, res) {
  Pantry.find({}, function(err, foundPantry) {
    if(err) {
      console.log(err);
    } else {
      res.render("pantry", {itemsArray: foundPantry});
    }
  })
});


// ROUTE made just as a workaround to the problem MongoDB has while adding the very first list to the DB. 
app.get("/limbo/:customListName", function(req, res) {
  const customListName = req.params.customListName;
  List.find({}, function(err, foundLists) {
    if(foundLists.length > 0) {    // Checks whether the array has any item/first entry has been created or not in the DB.  
      res.redirect("/" + customListName);
    } else if(foundLists.length === 0) {
      res.redirect("/limbo/" + customListName);   // If not then it redirects to itself and keeps on checking and in the process buys time for MongoDB.
    }
  })
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

app.post("/limbo/pantry/:itemName", function(req, res) {
  const name = req.params.itemName;
  Pantry.find({}, function(err, foundPantry) {
    if(err) {
      console.log(err);
    } else {
      if(foundPantry.length === 0) {
        res.redirect(307, "/limbo/pantry/" + name);
      } else if(foundPantry.length > 0) {
        res.redirect(307, "/add/" + name);
      }
    }
  })
});

app.post("/add/:itemName", function(req, res) {
  const name = req.params.itemName;
  const list = req.body.listTitle;
  const itemId = req.body.itemId;  

  Pantry.find({}, function(err, foundPantry) {
    if(err) {
      console.log(err);
    } else {
      if(foundPantry.length === 0) {    // foundPantry is an array of objects
        const pantry = new Pantry({
          name: name
        });
        pantry.save();
        res.redirect(307, "/limbo/pantry/" + name);    // 307 preserves the method - 'post' in this case as you cannot redirect to post from get 
      } else {
        if(foundPantry.length > 0) {
          let arr = [];
          foundPantry.forEach(function(item) {
            arr.push(item.name);
          })
          if(arr.length === 1 && arr.includes(name)) {
            res.redirect("/pantry");
          } else if(arr.includes(name)) {
            res.render("error");  ///////////////// create a new error page
          } else {
            const pantry = new Pantry({
              name: name
            });
            pantry.save();
            res.redirect("/pantry");
          }
        }
      }
    }
  });
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

app.post("/deletepantry", function(req, res) {
  const pantryItemToDelete = req.body.deletePantryItem  // deletePantryItem comes from pantry.ejs 2nd <form>

  if(pantryItemToDelete) {
    Pantry.deleteOne({name: pantryItemToDelete}, function(err, deletedItem) {
      if (err) {
        console.log(err);
      } else {
        // res.redirect("/pantry");
        // console.log(deletedItem);
        Pantry.find({}, function(err, foundPantry) {
          if(err) {
            console.log(err);
          } else {
            res.render("pantry", {itemsArray: foundPantry});
          }
        })
      }
    });
  }
});


app.post("/delete", function(req, res) {
  const checkedItemID = req.body.checkbox;          // checkbox comes from list.ejs 2nd <form>
  const listName = req.body.listDelete;     // listDelete comes from list.ejs 2nd <form>

  const listToDelete = req.body.listToDelete;   // listToDelete comes from lists.ejs 1st <form>


  if(listToDelete) {    // This condition handles if there is a request to delete a list from a bunch of lists.
    List.deleteOne({name: listToDelete}, function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log("Successfully deleted");
        List.find({}, function(err, foundLists) {   // This part renders the whole bunch of lists
          if(err) {
            console.log(err);
          } else {
            let array = [];
            for(const list of foundLists) {
              array.push(list.name);
            }
            const distinctLists = [...new Set(array)];   // To remove the multiple entries that get created.
            res.render("lists", {listsArray: distinctLists});
          }
        });
      }
    });
  } else {
    // This handles the deletion of a particular item in a given list
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemID}}}, function(err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      } else {
        console.log(err);
      }
    });
  }
});

app.post("/edit/:itemName", function(req, res) {
  const name = req.params.itemName;   // Comes from the url.
  const list = req.body.editedList;  // Comes from list.ejs 1st <form>
  const itemId = req.body.itemId;  // Comes from list.ejs 1st <form>

  res.render('edit', {oldItem: name, listName: list, itemId: itemId});
});

app.post("/:listName", function(req, res) {
  const listName = req.params.listName;   // Comes from the url.
  const newItem = req.body.newValue;   // Comes from edit.ejs
  const oldItem = req.body.oldValue;   // Comes from edit.ejs
  const itemId = req.body.itemId;      // Comes from edit.ejs

  List.findOne({name: listName}, function(err, foundItem) {  //  foundItem is the matched object
    if(err) {
      console.log(err);
    } else {
      const id = foundItem._id;  // list id
      const query = {"_id": id,
        "items._id": itemId
      }
      List.findOneAndUpdate(query, {$set: {"items.$.name": newItem }}, function(err, found) {    // 'items.$.name' checks the name property of objects inside the 'items' array.
        if(err) {
          console.log(err);
        } else {
          res.redirect(`/${listName}`);
        }
      }); 
    }
  });
});




app.listen(3000, function() {
  console.log("Server listening on PORT 3000!");
});