const express = require("express");
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const cors = require("cors");
require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;
const app = express();
const port = process.env.PORT || 5000;

// assignment-12-firebase-adminsdk.json

const serviceAccount = require("./assignment-12-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware:
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hvuwn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    client.connect();
    const database = client.db("MotorDB");
    const Collectionexplores = database.collection("BikeServices");
    const orderCollection = database.collection("orders");
    const reviewCollection = database.collection("reviews");
    const usersCollection = database.collection("users");

    // EXPLORE API
    app.post("/explores", async (req, res) => {
      const newService = req.body;
      const result = await Collectionexplores.insertOne(newService);
      res.json(result);
    });

    // GET API
    app.get("/explores", async (req, res) => {
      const cursor = Collectionexplores.find({});
      const explores = await cursor.toArray();
      res.send(explores);
    });

    app.delete("/explores/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await Collectionexplores.deleteOne(query);
      res.json(result);
    });

    //  API PlaceOrder Id
    app.get("/explores/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const explores = await Collectionexplores.findOne(query);
      res.json(explores);
    });
    // Order Api
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });

    app.get("/orders", async (req, res) => {
      const cursor = orderCollection.find({});
      const orders = await cursor.toArray();
      res.send(orders);
    });

    app.get("/orders", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = await orderCollection.findOne(query);
      res.send(cursor);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });
    // REVIEW API
    app.post("/reviews", async (req, res) => {
      const newService = req.body;
      const result = await reviewCollection.insertOne(newService);
      res.json(result);
    });

    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    // admin api
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello motor bike");
});

app.listen(port, () => {
  console.log(`server is runing ${port}`);
});
