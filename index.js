
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Allowed Origins
const allowedOrigins = [
    "http://localhost:3000",
    "https://doctor-tracker-client-seven.vercel.app",
];

// Middleware
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

app.use(express.json());

// MongoDB Configuration
const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("MONGODB_URI is missing in environment variables!");
}

const client = new MongoClient(uri);

let db;

// Connect to MongoDB
export async function connectToMongoDB() {
    try {
        await client.connect();

        db = client.db("DoctorTracker");

        console.log("Successfully connected to MongoDB!");

        return db;
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
    }
}

// Export Database
export function getDB() {
    if (!db) {
        throw new Error("Database is not connected!");
    }

    return db;
}

// Home Route
app.get("/", (req, res) => {
    res.status(200).send("Welcome to Doctor Tracker Server!");
});


const DBName = client.db("DoctorTracker");
const DoctorCollection = DBName.collection("DoctorCollection")
const PatientCollection = DBName.collection("PatientCollection")


app.get('/api/Doctors', async (req, res) => {
    const Data = await DoctorCollection.find().toArray()
    res.send(Data)
})

app.get('/api/Patiens', async (req, res) => {
    try {
        const { doctorId } = req.query;

        const query = doctorId ? { doctorId } : {};

        const Data = await PatientCollection
            .find(query)
            .toArray();

        res.status(200).json(Data);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to get patients",
            error: error.message
        });
    }
});


app.delete('/api/Patiens/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = { _id: new ObjectId(id) }
        const result = await PatientCollection.deleteOne(query);
        if (result.deletedCount === 0) {
            return res.status(404).send({
                message: "Patient not found",
            });
        }
        res.status(200).send(result);
    } catch (error) {
        console.error("DELETE Patient ERROR:", error);
        res.status(500).send({
            message: "Failed to delete Patient",
            error: error.message,
        });
    }
})



app.patch('/api/Patiens/:id', async (req, res) => {
    try {
        const id = new ObjectId(req.params.id);
        const Data = req.body;

        const newdata = {
            $set: {
                name: Data.name,
                age: Number(Data.age),
                gender: Data.gender,
                phone: Data.phone,
                email: Data.email,
                address: Data.address,
                condition: Data.condition,
                admissionDate: Data.admissionDate,
            },
        };

        const result = await PatientCollection.updateOne(
            { _id: id },
            newdata
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Patient updated successfully",
            result,
        });

    } catch (error) {
        console.error("PATCH error:", error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});




app.post('/api/Doctors', async (req, res) => {
    try {
        const Data = req.body;

        const NewData = {
            ...Data,
            createdAt: new Date(),
        };

        const result = await DoctorCollection.insertOne(NewData);

        res.status(201).send(result);
    } catch (error) {
        console.error("POST Doctor ERROR:", error);

        res.status(500).send({
            message: "Failed to add doctor",
            error: error.message,
        });
    }
})
app.post('/api/Patiens', async (req, res) => {
    try {
        const Data = req.body;

        const NewData = {
            ...Data,
            createdAt: new Date(),
        };

        const result = await PatientCollection.insertOne(NewData);

        res.status(201).send(result);
    } catch (error) {
        console.error("POST Patient ERROR:", error);

        res.status(500).send({
            message: "Failed to add Patient",
            error: error.message,
        });
    }
})






















// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running!",
    });
});

// Start Server
async function startServer() {
    try {
        await connectToMongoDB();

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
