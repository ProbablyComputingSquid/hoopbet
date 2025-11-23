import express from "express";
import fs from "fs";
import path from "path";
const app = express();
const PORT = process.env.PORT || 4000;

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

// place a bet: update market file and user file
app.post('/markets/bet', (req, res) => {
    const { marketId, optionIndex, optionName, amount, username, placed_at } = req.body;
    if (!marketId || !username || !amount) {
        return res.status(400).json({ message: 'Missing required fields: marketId, username, amount' });
    }

    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const marketFile = path.join(process.cwd(), 'data', 'Markets', `market${marketId}.json`);

    try {
        // load users
        const usersRaw = fs.readFileSync(usersPath, 'utf8');
        const users = JSON.parse(usersRaw);
        const user = users[username];
        if (!user) return res.status(404).json({ message: 'User not found' });

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        if ((Number(user.balance) || 0) < numericAmount) return res.status(400).json({ message: 'Insufficient balance' });

        // load market
        const marketRaw = fs.readFileSync(marketFile, 'utf8');
        const marketDb = JSON.parse(marketRaw);
        const src = marketDb.market ? marketDb.market : marketDb;

        // determine target array (yes/no)
        let targetKey = null;
        if (typeof optionIndex === 'number') {
            targetKey = optionIndex === 0 ? 'yes' : 'no';
        } else if (optionName) {
            const n = String(optionName).toLowerCase();
            targetKey = n.startsWith('y') ? 'yes' : 'no';
        } else {
            // default to yes if ambiguous
            targetKey = 'yes';
        }

        if (!Array.isArray(src[targetKey])) src[targetKey] = [];

        const ts = placed_at || new Date().toISOString();

        // push a market bet entry (keep types similar to sample: userID and string amount)
        src[targetKey].push({ userID: username, amount: String(numericAmount), placed_at: ts });

        // update users: deduct balance and add/merge bets_placed
        const prevBalance = Number(user.balance) || 0;
        user.balance = prevBalance - numericAmount;

        if (!Array.isArray(user.bets_placed)) user.bets_placed = [];

        const optionLabel = targetKey === 'yes' ? 'Yes' : 'No';
        const existingIndex = user.bets_placed.findIndex(b => b.marketid === marketId && b.option === optionLabel);
        if (existingIndex >= 0) {
            user.bets_placed[existingIndex].amount = (Number(user.bets_placed[existingIndex].amount) || 0) + numericAmount;
            user.bets_placed[existingIndex].placed_at = ts;
        } else {
            // compute a naive odds value: percentage of yes vs no
            const sum = (arr) => (Array.isArray(arr) ? arr.reduce((s, x) => s + (Number(x.amount) || 0), 0) : 0)
            const yesSum = sum(src.yes)
            const noSum = sum(src.no)
            const total = Math.max(1, yesSum + noSum)
            const odds = targetKey === 'yes' ? (yesSum/total)*100 : (noSum/total)*100

            user.bets_placed.push({ marketid: marketId, option: optionLabel, amount: numericAmount, odds, placed_at: ts })
        }

        // write files back
        // write market file preserving original wrapper if present
        const outMarket = marketDb.market ? { ...marketDb, market: src } : src;
        fs.writeFileSync(marketFile, JSON.stringify(outMarket, null, 2), 'utf8');
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');

        // return the mapped market (same shape as /markets mapping) and updated user
        const yesBets = Array.isArray(src.yes) ? src.yes.map(b => ({ username: b.userID || b.username, amount: Number(b.amount) || 0, placed_at: b.placed_at || b.timestamp })) : []
        const noBets = Array.isArray(src.no) ? src.no.map(b => ({ username: b.userID || b.username, amount: Number(b.amount) || 0, placed_at: b.placed_at || b.timestamp })) : []
        const sumArr = arr => arr.reduce((s, x) => s + (Number(x.amount) || 0), 0)
        const yesSum = sumArr(yesBets)
        const noSum = sumArr(noBets)
        const total = Math.max(1, yesSum + noSum)
        const options = [
            { option: 'Yes', odds: (yesSum/total)*100, bets: yesBets },
            { option: 'No', odds: (noSum/total)*100, bets: noBets }
        ]

        const mapped = {
            id: src.id || marketId,
            marketid: src.id || marketId,
            name: src.name || src.title || `Market ${marketId}`,
            status: src.status || 'open',
            created_at: src.created_at,
            ends_at: src.ends_at,
            options
        }

        return res.json({ market: mapped, user })
    } catch (err) {
        console.error('Failed to place bet:', err)
        return res.status(500).json({ message: 'Failed to place bet' })
    }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
