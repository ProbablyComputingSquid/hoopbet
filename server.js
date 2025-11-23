import express from "express";
import fs from "fs";
import path from "path";
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/users", (req, res) => {
    const database = fs.readFileSync("./data/users.json");
    const db = JSON.parse(database);
    const keys = Object.keys(db);
    res.json(keys);
});
app.get("/users.json", (req, res) => {});
app.use(express.json());

app.post("/register", (req, res) => {
    const { username, password, joinedAt } = req.body;
    if (!username || !password || !joinedAt) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const database = fs.readFileSync("./data/users.json");
    const db = JSON.parse(database);
    const newuser = {
        fullname : req.body.fullName,
        email : req.body.email,
        password: password,
        joined_at: joinedAt,
        balance: 0
    };
    db.push({ [username]: newuser });
    fs.writeFileSync("./data/users.json", JSON.stringify( db, null, 2));
    res.json({ message: "User registered successfully" });
});
app.post("/markets", (req, res) => {
    const mkitid = req.body.marketId;
    const database = fs.readFileSync("./data/markets/market" + mkitid + ".json");
    const db = JSON.parse(database);
    res.json(db);
})
    

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
