
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
    "http://localhost:3000",
    "https://doctor-tracker-client-seven.vercel.app",
];

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
    throw new Error("MONGODB_URI is missing!");
}

const client = new MongoClient(uri);

let dbPromise;

async function getDB() {
    if (!dbPromise) {
        dbPromise = client.connect()
            .then(() => {
                console.log("MongoDB connected successfully!");
                return client.db("DoctorTracker");
            })
            .catch((error) => {
                dbPromise = null;
                throw error;
            });
    }

    return dbPromise;
}

// JWT Configuration
let JWKS;

function getJWKS() {
    if (!JWKS) {
        if (!process.env.CLIENT_URL) {
            throw new Error("CLIENT_URL is missing!");
        }

        const jwksURL = new URL(
            `${process.env.CLIENT_URL}/api/auth/jwks`
        );

        JWKS = createRemoteJWKSet(jwksURL);
    }

    return JWKS;
}

// Home Route
app.get("/", (req, res) => {
    res.status(200).send("Welcome to Doctor Tracker Server!");
});

// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running!",
    });
});

// Authentication Middleware
const VerifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Unauthorized access",
            });
        }

        const token = authHeader.split(" ")[1];

        const { payload } = await jwtVerify(token, getJWKS());

        if (!payload.sub || !ObjectId.isValid(payload.sub)) {
            return res.status(403).json({
                message: "Invalid user token",
            });
        }

        const db = await getDB();
        const UsersCollection = db.collection("user");

        const user = await UsersCollection.findOne({
            _id: new ObjectId(payload.sub),
        });

        if (!user) {
            return res.status(401).json({
                message: "User not found",
            });
        }

        req.user = user;
        req.db = db;

        next();

    } catch (error) {
        console.error("Authentication Error:", error);

        return res.status(403).json({
            message: "Forbidden",
        });
    }
};

// GET Doctors
app.get("/api/Doctors", VerifyToken, async (req, res) => {
    try {
        const data = await req.db
            .collection("DoctorCollection")
            .find()
            .toArray();

        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to get doctors",
        });
    }
});

// GET Patients
app.get("/api/Patiens", VerifyToken, async (req, res) => {
    try {
        const { doctorId } = req.query;

        const query = doctorId ? { doctorId } : {};

        const data = await req.db
            .collection("PatientCollection")
            .find(query)
            .toArray();

        res.status(200).json(data);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to get patients",
            error: error.message,
        });
    }
});

// DELETE Patient
app.delete("/api/Patiens/:id", VerifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid patient ID",
            });
        }

        const result = await req.db
            .collection("PatientCollection")
            .deleteOne({
                _id: new ObjectId(id),
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Patient not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Patient deleted successfully",
        });

    } catch (error) {
        console.error("DELETE Patient ERROR:", error);

        res.status(500).json({
            message: "Failed to delete patient",
            error: error.message,
        });
    }
});

// UPDATE Patient
app.patch("/api/Patiens/:id", VerifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid patient ID",
            });
        }

        const data = req.body;

        const updateData = {
            name: data.name,
            age: Number(data.age),
            gender: data.gender,
            phone: data.phone,
            email: data.email,
            address: data.address,
            condition: data.condition,
            admissionDate: data.admissionDate,
        };

        const result = await req.db
            .collection("PatientCollection")
            .updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
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
        });

    } catch (error) {
        console.error("PATCH error:", error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// POST Doctor
app.post("/api/Doctors", VerifyToken, async (req, res) => {
    try {
        const data = req.body;

        const newData = {
            ...data,
            createdAt: new Date(),
        };

        const result = await req.db
            .collection("DoctorCollection")
            .insertOne(newData);

        res.status(201).json(result);

    } catch (error) {
        console.error("POST Doctor ERROR:", error);

        res.status(500).json({
            message: "Failed to add doctor",
            error: error.message,
        });
    }
});

// POST Patient
app.post("/api/Patiens", VerifyToken, async (req, res) => {
    try {
        const data = req.body;

        const newData = {
            ...data,
            createdAt: new Date(),
        };

        const result = await req.db
            .collection("PatientCollection")
            .insertOne(newData);

        res.status(201).json(result);

    } catch (error) {
        console.error("POST Patient ERROR:", error);

        res.status(500).json({
            message: "Failed to add patient",
            error: error.message,
        });
    }
});

// Export Express App for Vercel
export default app;

// Local Development
if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
