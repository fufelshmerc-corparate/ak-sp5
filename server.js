var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectId = mongodb.ObjectId;

var CONTACTS_COLLECTION = "contacts";

var app = express();
app.use(bodyParser.json());

var db;

var client = new mongodb.MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/contacts");
client.connect().then(function () {
  db = client.db();
  console.log("База данных подключена");

  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("Приложение запущено на порту", port);
  });
}).catch(function (err) {
  console.log(err);
  process.exit(1);
});

function handleError(res, reason, message, code) {
  console.log("Ошибка: " + reason);
  res.status(code || 500).json({ "error": message });
}

function getId(req, res) {
  if (!ObjectId.isValid(req.params.id)) {
    handleError(res, "Неверный id", "Неверный id контакта", 400);
    return null;
  }
  return new ObjectId(req.params.id);
}


app.get("/v1/contact", function (req, res) {
  db.collection(CONTACTS_COLLECTION).find({}).toArray()
    .then(function (docs) { res.status(200).json(docs); })
    .catch(function (err) { handleError(res, err.message, "Не удалось получить контакты"); });
});

app.post("/v1/contact", function (req, res) {
  var newContact = req.body;
  if (!newContact.username) {
    return handleError(res, "Нет имени", "Нужно указать username", 400);
  }
  db.collection(CONTACTS_COLLECTION).insertOne(newContact)
    .then(function (result) {
      newContact._id = result.insertedId;
      res.status(201).json(newContact);
    })
    .catch(function (err) { handleError(res, err.message, "Не удалось создать контакт"); });
});

app.delete("/v1/contact", function (req, res) {
  db.collection(CONTACTS_COLLECTION).deleteMany({})
    .then(function (result) { res.status(200).json({ "deleted": result.deletedCount }); })
    .catch(function (err) { handleError(res, err.message, "Не удалось удалить контакты"); });
});


app.get("/v1/contact/:id", function (req, res) {
  var id = getId(req, res);
  if (!id) return;
  db.collection(CONTACTS_COLLECTION).findOne({ _id: id })
    .then(function (doc) {
      if (!doc) return handleError(res, "Не найден", "Контакт не найден", 404);
      res.status(200).json(doc);
    })
    .catch(function (err) { handleError(res, err.message, "Не удалось получить контакт"); });
});

app.put("/v1/contact/:id", function (req, res) {
  var id = getId(req, res);
  if (!id) return;
  var updateDoc = req.body;
  delete updateDoc._id;
  db.collection(CONTACTS_COLLECTION).replaceOne({ _id: id }, updateDoc)
    .then(function (result) {
      if (result.matchedCount === 0) return handleError(res, "Не найден", "Контакт не найден", 404);
      updateDoc._id = id;
      res.status(200).json(updateDoc);
    })
    .catch(function (err) { handleError(res, err.message, "Не удалось обновить контакт"); });
});

app.delete("/v1/contact/:id", function (req, res) {
  var id = getId(req, res);
  if (!id) return;
  db.collection(CONTACTS_COLLECTION).deleteOne({ _id: id })
    .then(function (result) {
      if (result.deletedCount === 0) return handleError(res, "Не найден", "Контакт не найден", 404);
      res.status(200).json({ "id": req.params.id });
    })
    .catch(function (err) { handleError(res, err.message, "Не удалось удалить контакт"); });
});
