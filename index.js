require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    // GET API to fetch all donors
    app.get("/donors", async (req, res) => {
      try {
        const { bloodGroup, district, upazila } = req.query;

        const query = { role: "donor" };
        if (bloodGroup) query.bloodGroup = bloodGroup;
        if (district) query.district = district;
        if (upazila) query.upazila = upazila;

        const donors = await usersCollection.find(query).toArray();

        if (donors.length > 0) {
          res.status(200).send({
            success: true,
            donors,
          });
        } else {
          res.status(404).send({
            success: false,
            message: "No donors found matching the criteria",
          });
        }
      } catch (error) {
        console.error("Error fetching donors:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch donors. Please try again later.",
        });
      }
    });

    // Endpoint to Get All Users with Pagination and filters
    app.get("/users", async (req, res) => {
      const { page = 1, limit = 6, status } = req.query;
      const filter = status ? { status } : {};
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await usersCollection
        .find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalUsers = await usersCollection.countDocuments(filter);

      res.send({ users, total: totalUsers });
    });

    app.put("/user/:id", async (req, res) => {
      const { id } = req.params;
    
      const { role, status } = req.body;
      const updateFields = {};
      if (role) updateFields.role = role;
      if (status) updateFields.status = status;
    
      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );
    
        if (result.matchedCount > 0) {
          res.send({ success: true, message: "User updated successfully" });
        } else {
          res.status(404).send({ success: false, message: "Userssssssss not found" });
        }
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ success: false, message: "Internal Server Error" });
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

    // get api to get the donation request of an user
    app.get("/donation-requests/:email", async (req, res) => {
      const { email } = req.params;
      const { page = 1, limit = 5, filter } = req.query;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      // Construct query
      const query = { requesterEmail: email };
      if (filter && filter !== "all") {
        query.donationStatus = filter.toLowerCase();
      }

      try {
        // Fetch filtered and paginated requests
        const donationRequests = await donationRequestsCollection
          .find(query)
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
          .toArray();

        // Count total matching requests
        const totalRequests = await donationRequestsCollection.countDocuments(
          query
        );

        res.send({
          success: true,
          totalRequests,
          totalPages: Math.ceil(totalRequests / limitNumber),
          currentPage: pageNumber,
          requests: donationRequests,
        });
      } catch (error) {
        console.error("Error retrieving donation requests:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch donation requests. Please try again later.",
        });
      }
    });

    // Get all donation requests with 'pending' status
    app.get("/donation-requests-pending", async (req, res) => {
      try {
        // Fetch all pending donation requests
        const pendingRequests = await donationRequestsCollection
          .find({ donationStatus: "pending" })
          .toArray(); // Convert cursor to array

        if (pendingRequests.length === 0) {
          return res
            .status(404)
            .send({ success: false, message: "No pending requests found" });
        }

        res.send({
          success: true,
          requests: pendingRequests,
        });
      } catch (error) {
        console.error("Error fetching pending donation requests:", error);
        res.status(500).send({
          success: false,
          message:
            "Failed to fetch pending donation requests. Please try again later.",
        });
      }
    });

    // Backend Code Enhancements
    app.get("/donation-request/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const donationRequest = await donationRequestsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (donationRequest) {
          res.send(donationRequest);
        } else {
          res
            .status(404)
            .send({ success: false, message: "Donation request not found" });
        }
      } catch (error) {
        console.error("Error retrieving donation request:", error);
        res.status(500).send({
          success: false,
          message: "Failed to retrieve donation request",
        });
      }
    });

    app.put("/donation-requests/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      try {
        const objectId = new ObjectId(id);

        const result = await donationRequestsCollection.updateOne(
          { _id: objectId },
          { $set: updatedData }
        );

        if (result.matchedCount === 0) {
          res.status(404).send({
            success: false,
            message: "Donation request not found",
          });
        } else {
          res.send({
            success: true,
            message: "Donation request updated successfully",
          });
        }
      } catch (error) {
        console.error("Error updating donation request:", error);
        res.status(500).send({
          success: false,
          message: "Failed to update donation request",
        });
      }
    });

    app.delete("/donation-requests/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const result = await donationRequestsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          res
            .status(404)
            .send({ success: false, message: "Donation request not found" });
        } else {
          res.send({
            success: true,
            message: "Donation request deleted successfully",
          });
        }
      } catch (error) {
        console.error("Error deleting donation request:", error);
        res.status(500).send({
          success: false,
          message: "Failed to delete donation request",
        });
      }
    });

    app.patch("/donation-requests/:id/status", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      if (!["inprogress", "done", "canceled"].includes(status)) {
        return res
          .status(400)
          .send({ success: false, message: "Invalid status value" });
      }

      try {
        const result = await donationRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { donationStatus: status } }
        );

        if (result.matchedCount === 0) {
          res
            .status(404)
            .send({ success: false, message: "Donation request not found" });
        } else {
          res.send({
            success: true,
            message: "Donation request status updated successfully",
          });
        }
      } catch (error) {
        console.error("Error updating donation status:", error);
        res.status(500).send({
          success: false,
          message: "Failed to update donation status",
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
  console.log(`BloodLink Server is running on port: ${port}`);
});
