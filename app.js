import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// ✅ Connect to SQLite database
const dbPromise = open({
  filename: "./data.db",
  driver: sqlite3.Database,
});

(async () => {
  const db = await dbPromise;
  await db.run(`
    CREATE TABLE IF NOT EXISTS strings (
      id TEXT PRIMARY KEY,
      value TEXT UNIQUE,
      length INTEGER,
      is_palindrome BOOLEAN,
      unique_characters INTEGER,
      word_count INTEGER,
      character_frequency_map TEXT,
      created_at TEXT
    )
  `);
})();

// ✅ Helper function: analyze string
function analyzeString(str) {
  const length = str.length;
  const is_palindrome =
    str.toLowerCase() === str.toLowerCase().split("").reverse().join("");
  const unique_characters = new Set(str).size;
  const word_count = str.trim().split(/\s+/).length;
  const sha256_hash = crypto.createHash("sha256").update(str).digest("hex");

  const character_frequency_map = {};
  for (let char of str) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }

  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}

// ✅ POST /strings - Analyze and store string
app.post("/strings", async (req, res) => {
  const { value } = req.body;
  if (!value) return res.status(400).json({ error: "Missing 'value' field" });
  if (typeof value !== "string")
    return res.status(422).json({ error: "'value' must be a string" });

  const props = analyzeString(value);
  const db = await dbPromise;

  try {
    await db.run(
      `INSERT INTO strings 
       (id, value, length, is_palindrome, unique_characters, word_count, character_frequency_map, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        props.sha256_hash,
        value,
        props.length,
        props.is_palindrome ? 1 : 0,
        props.unique_characters,
        props.word_count,
        JSON.stringify(props.character_frequency_map),
        new Date().toISOString(),
      ]
    );

    res.status(201).json({
      id: props.sha256_hash,
      value,
      properties: props,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed"))
      return res.status(409).json({ error: "String already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /strings with filters
app.get("/strings", async (req, res) => {
  const db = await dbPromise;
  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  let query = "SELECT * FROM strings WHERE 1=1";
  const params = [];

  if (is_palindrome !== undefined) {
    query += " AND is_palindrome = ?";
    params.push(is_palindrome === "true" ? 1 : 0);
  }
  if (min_length !== undefined) {
    query += " AND length >= ?";
    params.push(Number(min_length));
  }
  if (max_length !== undefined) {
    query += " AND length <= ?";
    params.push(Number(max_length));
  }
  if (word_count !== undefined) {
    query += " AND word_count = ?";
    params.push(Number(word_count));
  }
  if (contains_character !== undefined) {
    query += " AND value LIKE ?";
    params.push(`%${contains_character}%`);
  }

  try {
    const rows = await db.all(query, params);
    const data = rows.map((row) => ({
      id: row.id,
      value: row.value,
      properties: {
        length: row.length,
        is_palindrome: !!row.is_palindrome,
        unique_characters: row.unique_characters,
        word_count: row.word_count,
        sha256_hash: row.id,
        character_frequency_map: JSON.parse(row.character_frequency_map),
      },
      created_at: row.created_at,
    }));

    res.json({
      data,
      count: data.length,
      filters_applied: req.query,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /strings/:value
app.get("/strings/:value", async (req, res) => {
  const db = await dbPromise;
  const { value } = req.params;
  const row = await db.get(`SELECT * FROM strings WHERE value = ?`, [value]);
  if (!row) return res.status(404).json({ error: "String not found" });

  res.json({
    id: row.id,
    value: row.value,
    properties: {
      length: row.length,
      is_palindrome: !!row.is_palindrome,
      unique_characters: row.unique_characters,
      word_count: row.word_count,
      sha256_hash: row.id,
      character_frequency_map: JSON.parse(row.character_frequency_map),
    },
    created_at: row.created_at,
  });
});

// ✅ DELETE /strings/:value
app.delete("/strings/:value", async (req, res) => {
  const db = await dbPromise;
  const { value } = req.params;

  const row = await db.get(`SELECT * FROM strings WHERE value = ?`, [value]);
  if (!row) return res.status(404).json({ error: "String not found" });

  await db.run(`DELETE FROM strings WHERE value = ?`, [value]);
  res.status(204).send(); // No content
});

// ✅ GET /strings/filter-by-natural-language
app.get("/strings/filter-by-natural-language", async (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Missing 'query' parameter" });

  const filters = {};
  const lowerQuery = query.toLowerCase();

  // Basic parsing
  if (lowerQuery.includes("palindromic")) filters.is_palindrome = true;
  if (lowerQuery.includes("single word")) filters.word_count = 1;
  const wordsMatch = lowerQuery.match(/(\d+) words?/);
  if (wordsMatch) filters.word_count = Number(wordsMatch[1]);

  const lengthMatch = lowerQuery.match(/longer than (\d+)/);
  if (lengthMatch) filters.min_length = Number(lengthMatch[1]) + 1;

  const containsMatch = lowerQuery.match(/contain(?:ing)? the letter (\w)/);
  if (containsMatch) filters.contains_character = containsMatch[1];

  try {
    const queryStr = Object.entries(filters)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    const response = await fetch(`http://localhost:8080/strings?${queryStr}`);
    const data = await response.json();

    res.json({
      data: data.data,
      count: data.count,
      interpreted_query: {
        original: query,
        parsed_filters: filters,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
