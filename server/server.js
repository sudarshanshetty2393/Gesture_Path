import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 5005;

app.use(cors());
app.use(bodyParser.json());

// Paths
const DATA_DIR = path.join(__dirname, 'data');

// ============================================
// MONGODB CONNECTION
// ============================================

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
}, { timestamps: true });

const historySchema = new mongoose.Schema({
    userId: String,
    type: String,
    content: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const History = mongoose.model('History', historySchema);

// ============================================
// AUTHENTICATION & HISTORY
// ============================================

// Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (await User.findOne({ email })) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = await User.create({ username, email, password });

        res.status(201).json({ user: { id: newUser._id, username: newUser.username, email: newUser.email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        res.json({ user: { id: user._id, username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get History
app.get('/api/history/:userId', async (req, res) => {
    try {
        const userHistory = await History.find({ userId: req.params.userId }).sort({ timestamp: -1 });
        res.json(userHistory);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add History
app.post('/api/history', async (req, res) => {
    try {
        const { userId, type, content } = req.body;
        const newEntry = await History.create({ userId, type, content });
        res.status(201).json(newEntry);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TRANSLATION LOGIC (From jasigning-demo)
// ============================================

const STOP_WORDS = new Set([
    'the', 'is', 'are', 'was', 'were', 'a', 'an', 'and',
    'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'from', 'as', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'it', 'its'
]);

const STEM_EXCEPTIONS = new Set([
    'morning', 'evening', 'thing', 'something', 'nothing', 'anything',
    'king', 'ring', 'sing', 'wing', 'string', 'bring', 'spring',
    'during', 'ceiling', 'feeling', 'being', 'seeing'
]);

function stemWord(word) {
    word = word.toLowerCase();
    if (STEM_EXCEPTIONS.has(word)) return word;

    if (word.endsWith('ing') && word.length > 5) {
        let base = word.slice(0, -3);
        if (base.length < 3) return word;
        if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
            const lastChar = base[base.length - 1];
            if ('nptgm'.includes(lastChar)) base = base.slice(0, -1);
        }
        return base;
    }

    if (word.endsWith('ed') && word.length > 4) {
        let base = word.slice(0, -2);
        if (base.length < 3) return word;
        if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
            const lastChar = base[base.length - 1];
            if ('nptgm'.includes(lastChar)) base = base.slice(0, -1);
        }
        return base;
    }

    if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
    if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);

    return word;
}

function convertToSignLanguageText(text) {
    text = text.replace(/[\u2018\u2019]/g, "'");
    const cleanText = text.replace(/[.,!?;:"()\[\]{}]/g, '');
    return cleanText;
}

function tokenizeText(text) {
    return text.split(/\s+/).filter(word => word.length > 0);
}

async function getSiGML(word) {
    const normalizedWord = word.toLowerCase();
    const filePath = path.join(DATA_DIR, `${normalizedWord}.sigml`);

    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        return null;
    }
}

// Translation Endpoint
app.post('/api/translate', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const signLanguageText = convertToSignLanguageText(text);
    const words = tokenizeText(signLanguageText);
    const resultSequence = [];
    const missingWords = [];

    let i = 0;
    while (i < words.length) {
        let matchFound = false;

        // 1. Longest phrase match
        for (let len = words.length - i; len >= 1; len--) {
            const phraseWords = words.slice(i, i + len);
            const phrase = phraseWords.join('_');
            const sigml = await getSiGML(phrase);

            if (sigml) {
                resultSequence.push({
                    word: phrase,
                    type: 'phrase',
                    sigml: sigml
                });
                i += len;
                matchFound = true;
                break;
            }
        }

        // 2. Stemming fallback
        if (!matchFound) {
            const word = words[i];
            const stemmedWord = stemWord(word);

            if (stemmedWord !== word) {
                const sigml = await getSiGML(stemmedWord);
                if (sigml) {
                    resultSequence.push({
                        word: word,
                        stem: stemmedWord,
                        type: 'stem',
                        sigml: sigml
                    });
                    i++;
                    matchFound = true;
                }
            }
        }

        // 3. Missing word
        if (!matchFound) {
            const word = words[i];
            missingWords.push(word);
            resultSequence.push({
                word: word,
                type: 'missing',
                sigml: null
            });
            i++;
        }
    }

    res.json({
        original_text: text,
        sign_language_text: signLanguageText,
        sequence: resultSequence,
        missing_words: missingWords
    });
});

// ============================================
// CUSTOM GESTURES (HamNoSys Builder)
// ============================================

// Save Custom Gesture
app.post('/api/gestures', async (req, res) => {
    try {
        const { word, sigml } = req.body;
        if (!word || !sigml) {
            return res.status(400).json({ message: 'Word and SiGML are required' });
        }

        const normalizedWord = word.toLowerCase().replace(/\s+/g, '_');
        const filePath = path.join(DATA_DIR, `${normalizedWord}.sigml`);

        await fs.writeFile(filePath, sigml);

        res.status(201).json({ message: 'Gesture saved successfully', word: normalizedWord });
    } catch (error) {
        console.error('Error saving gesture:', error);
        res.status(500).json({ message: 'Failed to save gesture' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
