
# 🧩 String Analyser Service

A RESTful API that analyzes strings, stores their computed properties, and allows querying based on those properties. Built with **Node.js**, **Express**, and **SQLite**.


## 🚀 Features

For each analyzed string, the service computes and stores:

* `length` – Number of characters
* `is_palindrome` – Boolean indicating if the string reads the same forwards and backwards
* `unique_characters` – Number of distinct characters
* `word_count` – Number of words
* `sha256_hash` – SHA-256 hash of the string
* `character_frequency_map` – Frequency of each character
* `created_at` – Timestamp of creation

API supports:

* Creating / analyzing strings
* Retrieving strings individually or with filters
* Deleting strings
* Querying via natural language (future extension)


## 📦 Tech Stack

* Node.js 22+
* Express.js
* SQLite
* Railway (Deployment)
* ES Modules syntax (`type: "module"` in `package.json`)

## ⚙️ Setup Instructions

1. **Clone the repository**

```bash
git clone <your-github-repo-url>
cd string-analyser-service
```

2. **Install dependencies**

```bash
npm install
```

3. **Run locally**

```bash
node app.js
```

Server will run on `http://localhost:8080` by default.

---

## 🧹 .gitignore

```gitignore
node_modules/
data.db
.env
```


## 🌐 Deployment

The app is deployed at:

**[https://string-analyser-service-production-6739.up.railway.app](https://string-analyser-service-production-6739.up.railway.app)**


## 🛠 How to Use / Test the API

You can test the API endpoints locally or on the deployed Railway app using `curl` or any API client like Postman.



### 1. **Analyze / Create a String**

**POST /strings**

```bash
curl -X POST https://string-analyser-service-production-6739.up.railway.app/strings \
-H "Content-Type: application/json" \
-d '{"value": "madam"}'
```

**Response Example:**

```json
{
  "id": "765cc52b3dbc1bb8ec279ef9c8ec3d0f251c0c92a6ecdc1870be8f7dc7538b21",
  "value": "madam",
  "properties": {
    "length": 5,
    "is_palindrome": true,
    "unique_characters": 3,
    "word_count": 1,
    "sha256_hash": "765cc52b3dbc1bb8ec279ef9c8ec3d0f251c0c92a6ecdc1870be8f7dc7538b21",
    "character_frequency_map": {"m": 2, "a": 2, "d": 1}
  },
  "created_at": "2025-10-22T15:59:35.273Z"
}
```



### 2. **Retrieve a Specific String**

**GET /strings/:value**

```bash
curl https://string-analyser-service-production-6739.up.railway.app/strings/madam
```



### 3. **Retrieve All Strings (with Filters)**

**GET /strings**

Query parameters:

* `is_palindrome` – `true` / `false`
* `min_length` – Minimum string length
* `max_length` – Maximum string length
* `word_count` – Exact word count
* `contains_character` – Single character

**Example: Filter palindromes longer than 5 characters**

```bash
curl "https://string-analyser-service-production-6739.up.railway.app/strings?is_palindrome=true&min_length=5"
```

---

### 4. **Delete a String**

**DELETE /strings/:value**

```bash
curl -X DELETE https://string-analyser-service-production-6739.up.railway.app/strings/racecar
```

**Response:** `204 No Content` (empty body)



## ✅ Error Handling

* `400 Bad Request` – Missing or invalid parameters
* `409 Conflict` – String already exists
* `404 Not Found` – String not found
* `422 Unprocessable Entity` – Invalid data type


## 📚 Notes

* Uses SQLite database (`data.db`) stored locally or in container
* Strings are uniquely identified by SHA-256 hash
* Filters can be combined to refine queries
* Can be extended for natural language filtering or additional analytics

