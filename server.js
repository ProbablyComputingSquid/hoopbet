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

// set resolution for a market
app.post('/markets/resolve', (req, res) => {
    const { marketId, resolved_at, resolver, resolution } = req.body;
    if (!marketId || !resolver) return res.status(400).json({ message: 'Missing required fields: marketId, resolver' });

    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const marketFile = path.join(process.cwd(), 'data', 'Markets', `market${marketId}.json`);

    try {
        const usersRaw = fs.readFileSync(usersPath, 'utf8');
        const users = JSON.parse(usersRaw);

        const marketRaw = fs.readFileSync(marketFile, 'utf8');
        const marketDb = JSON.parse(marketRaw);
        const src = marketDb.market ? marketDb.market : marketDb;

        const ts = resolved_at || new Date().toISOString();

        src.resolution = resolution === undefined ? (src.resolution || 'resolved') : resolution;
        src.status = 'resolved';
        src.resolver = src.resolver || {};
        src.resolver.username = resolver;
        src.resolver.user = (users[resolver] && users[resolver].full_name) ? users[resolver].full_name : resolver;
        src.resolver.resolved_at = ts;

        // record that this user resolved this market
        if (!users[resolver]) users[resolver] = { password: '', joined_at: null, balance: 0, bets_placed: [] }
        if (!Array.isArray(users[resolver].resolved_markets)) users[resolver].resolved_markets = []
        if (!users[resolver].resolved_markets.includes(src.id || marketId)) users[resolver].resolved_markets.push(src.id || marketId)

        // perform payouts if resolution explicitly indicates a winning side (Yes/No)
        // determine winning key: 'yes' or 'no'
        let winKey = null
        if (typeof src.resolution === 'string') {
            const r = src.resolution.trim().toLowerCase()
            if (r === 'yes' || r === 'y' || r === 'true') winKey = 'yes'
            else if (r === 'no' || r === 'n' || r === 'false') winKey = 'no'
            else if (r === 'yes' || r === 'no') winKey = r
        }

        // fallback: if resolution param provided in request, use that
        if (!winKey && typeof resolution === 'string') {
            const r2 = resolution.trim().toLowerCase()
            if (r2 === 'yes' || r2 === 'y') winKey = 'yes'
            else if (r2 === 'no' || r2 === 'n') winKey = 'no'
        }

        // compute payouts
        const yesArr = Array.isArray(src.yes) ? src.yes : []
        const noArr = Array.isArray(src.no) ? src.no : []
        const sum = (arr) => arr.reduce((s, b) => s + (Number(b.amount) || 0), 0)
        const yesSum = sum(yesArr)
        const noSum = sum(noArr)

        // winners get: stake + proportional share of losers' pool (no house fee)
        if (winKey === 'yes' || winKey === 'no') {
            const winners = winKey === 'yes' ? yesArr : noArr
            const losersTotal = winKey === 'yes' ? noSum : yesSum
            const winnersTotal = winKey === 'yes' ? yesSum : noSum

            if (winnersTotal > 0 && losersTotal > 0) {
                // credit each winner
                winners.forEach(b => {
                    const uid = b.userID || b.username
                    const stake = Number(b.amount) || 0
                    const share = (stake / winnersTotal) * losersTotal
                    const payout = stake + share
                    if (!users[uid]) return
                    users[uid].balance = (Number(users[uid].balance) || 0) + payout

                    // mark user's bets_placed entry if exists
                    if (!Array.isArray(users[uid].bets_placed)) users[uid].bets_placed = []
                    const idx = users[uid].bets_placed.findIndex(bp => bp.marketid === (src.id || marketId) && bp.option === (winKey === 'yes' ? 'Yes' : 'No'))
                    if (idx >= 0) {
                        users[uid].bets_placed[idx].resolved = true
                        users[uid].bets_placed[idx].payout = (users[uid].bets_placed[idx].payout || 0) + payout
                    }
                })
            }
        }

        const outMarket = marketDb.market ? { ...marketDb, market: src } : src;
        fs.writeFileSync(marketFile, JSON.stringify(outMarket, null, 2), 'utf8');
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');

        // build mapped response
        const yesBets = Array.isArray(src.yes) ? src.yes.map(b => ({ username: b.userID || b.username, amount: Number(b.amount) || 0, placed_at: b.placed_at || b.timestamp })) : []
        const noBets = Array.isArray(src.no) ? src.no.map(b => ({ username: b.userID || b.username, amount: Number(b.amount) || 0, placed_at: b.placed_at || b.timestamp })) : []
        const total = Math.max(1, yesSum + noSum)
        const options = [
            { option: 'Yes', odds: (yesSum/total)*100, bets: yesBets },
            { option: 'No', odds: (noSum/total)*100, bets: noBets }
        ]

        const mapped = {
            id: src.id || marketId,
            marketid: src.id || marketId,
            name: src.name || src.title || `Market ${marketId}`,
            description: src.description || '',
            status: src.status || 'open',
            created_at: src.created_at,
            ends_at: src.ends_at,
            resolved_at: src.resolver?.resolved_at || src.resolved_at || null,
            resolution: src.resolution || null,
            resolver: src.resolver || null,
            options
        }

        return res.json({ market: mapped, users })
    } catch (err) {
        console.error('Failed to set resolution:', err)
        return res.status(500).json({ message: 'Failed to set resolution' })
    }
})

// create a new market
app.post('/markets/create', (req, res) => {
    const { title, description, ends_at, username } = req.body;
    if (!title || !username) return res.status(400).json({ message: 'Missing required fields: title, username' });

    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const marketsDir = path.join(process.cwd(), 'data', 'Markets');

    try {
        const usersRaw = fs.readFileSync(usersPath, 'utf8');
        const users = JSON.parse(usersRaw);
        const user = users[username];
        if (!user) return res.status(404).json({ message: 'User not found' });

        // determine next market id based on existing files
        const files = fs.readdirSync(marketsDir).filter(f => f.match(/^market(\d+)\.json$/i));
        const nums = files.map(f => {
            const m = f.match(/market(\d+)\.json/i);
            return m ? parseInt(m[1], 10) : 0
        })
        const next = (nums.length ? Math.max(...nums) + 1 : 1);
        const padded = String(next).padStart(3, '0');
        const filename = `market${padded}.json`;
        const marketId = padded;

        const created_at = new Date().toISOString();

        const newMarket = {
            market: {
                name: title,
                description: description || '',
                yes: [],
                no: [],
                status: 'open',
                created_at,
                ends_at: ends_at || null,
                resolution: null,
                resolver: {
                    user: user.full_name || username,
                    username,
                    resolved_at: null
                },
                created_by: username,
                id: marketId
            }
        }

        fs.writeFileSync(path.join(marketsDir, filename), JSON.stringify(newMarket, null, 2), 'utf8');

        // add to user's profile: created_markets
        if (!Array.isArray(user.created_markets)) user.created_markets = [];
        user.created_markets.push(marketId);

        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');

        // return created market in the mapped frontend shape
        const mapped = {
            id: marketId,
            marketid: marketId,
            name: newMarket.market.name,
            description: newMarket.market.description,
            status: newMarket.market.status,
            created_at: newMarket.market.created_at,
            ends_at: newMarket.market.ends_at,
            options: [ { option: 'Yes', odds: 0, bets: [] }, { option: 'No', odds: 0, bets: [] } ],
            resolver: newMarket.market.resolver
        }

        return res.json({ market: mapped, user })
    } catch (err) {
        console.error('Failed to create market:', err)
        return res.status(500).json({ message: 'Failed to create market' })
    }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
