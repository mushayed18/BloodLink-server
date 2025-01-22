require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bnuku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const usersCollection = client.db("BloodLinkDB").collection("users");
    const donationRequestsCollection = client
      .db("BloodLinkDB")
      .collection("donationRequests");

    // user related api
    app.post("/register", async (req, res) => {
      const userData = req.body;
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email });
        if (user) {
          res.send(user);
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Server error" });
      }
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const updatedData = req.body;

      try {
        const result = await usersCollection.updateOne(
          { email },
          { $set: updatedData }
        );
        if (result.matchedCount === 0) {
          res.status(404).send({ message: "User not found" });
        } else {
          res.send({ message: "User updated successfully" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error updating user" });
      }
    });

    // POST API to create a new donation request
    app.post("/donation-requests", async (req, res) => {
      const donationRequest = req.body;

      try {
        const result = await donationRequestsCollection.insertOne(
          donationRequest
        );
        res.send({
          success: true,
          message: "Donation request created successfully!",
          result,
        });
      } catch (error) {
        console.error("Error inserting donation request:", error);
        res.status(500).send({
          success: false,
          message: "Failed to create donation request. Please try again.",
        });
      }
    });

    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BloodLink server is running");
});

app.listen(port, () => {
  console.log(`Coffee Server is running on port: ${port}`);
});
