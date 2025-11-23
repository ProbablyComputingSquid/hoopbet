import express from "express";
import fs from "fs";
import path from "path";
const app = express();
const PORT = process.env.PORT || 3000;

// parse JSON bodies for incoming requests (must be before routes that use req.body)
app.use(express.json());

app.get("/users", (req, res) => {
    try {
        const database = fs.readFileSync(path.join(process.cwd(), "data", "users.json"), "utf8");
        const db = JSON.parse(database);
        const keys = Object.keys(db);
        return res.json(keys);
    } catch (err) {
        console.error("Failed to read users.json:", err);
        return res.status(500).json({ message: "Unable to load users" });
    }
});

// serve the full users JSON
app.get("/users.json", (req, res) => {
    try {
        const fullPath = path.join(process.cwd(), "data", "users.json");
        const database = fs.readFileSync(fullPath, "utf8");
        const db = JSON.parse(database);
        return res.json(db);
    } catch (err) {
        console.error("Failed to read users.json:", err);
        return res.status(500).json({ message: "Unable to load users" });
    }
});

app.post("/register", (req, res) => {
    const { username, password } = req.body;
    // accept either joinedAt or joined_at from client
    const joinedAt = req.body.joinedAt || req.body.joined_at;
    if (!username || !password || !joinedAt) {
        return res.status(400).json({ message: "Missing required fields: username, password, joinedAt" });
    }

    const usersPath = path.join(process.cwd(), "data", "users.json");
    try {
        const database = fs.readFileSync(usersPath, "utf8");
        const db = JSON.parse(database);

        if (db[username]) {
            return res.status(409).json({ message: "Username already exists" });
        }

        const newuser = {
            password: password,
            joined_at: joinedAt,
            balance: 0,
            bets_placed: []
        };

        // add user object keyed by username (users.json is an object)
        db[username] = newuser;

        fs.writeFileSync(usersPath, JSON.stringify(db, null, 2), "utf8");
        return res.json({ message: "User registered successfully" });
    } catch (err) {
        console.error("Failed to register user:", err);
        return res.status(500).json({ message: "Unable to register user" });
    }
});

app.post("/markets", (req, res) => {
    const mkitid = req.body.marketId;
    if (!mkitid) {
        return res.status(400).json({ message: "Missing marketId in request body" });
    }

    // markets directory is `data/Markets` in the repo
    const marketFile = path.join(process.cwd(), "data", "Markets", `market${mkitid}.json`);
    try {
        const database = fs.readFileSync(marketFile, "utf8");
        const db = JSON.parse(database);
        return res.json(db);
    } catch (err) {
        console.error(`Failed to read market file ${marketFile}:`, err);
        return res.status(404).json({ message: "Market not found" });
    }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
