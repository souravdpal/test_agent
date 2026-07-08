# Advanced Assessment Architecture (QNA-Tester)

A high-performance, stateless testing framework designed for precision, speed, and truth in academic and technical assessment. Built on a Node.js/Express backend with EJS templating and a MySQL database, this system provides a raw, no-nonsense environment for both test creators and candidates.

## 🚀 Core Systems

### 1. The Assessment Portal (`qna.ejs`)
A secure, distraction-free environment for candidates to take assessments.
* **Dynamic Telemetry:** Real-time state syncing and secure JSON payload generation upon completion.
* **Strict Timing Mechanisms:** Immutable countdown timers tied directly to the test's core configuration.
* **Mathematical Precision:** Native support for rendering complex scientific and mathematical notation (e.g., $E = mc^2$, $9.8\ m/s^2$) seamlessly in questions and options.

### 2. The Test Builder (`test_maker.ejs`)
A dual-mode construction engine for rapid assessment deployment.
* **Manual Builder:** A structured UI to define test parameters, construct questions, mark correct answers, and assign specific user access configurations (`users_access`).
* **JSON Ingestion:** Allows power users to upload raw JSON files (either structured or legacy ID-keyed formats) to bulk-generate testing environments instantly.
* **Deterministic ID Generation:** Automatically structures primary keys using the format `testname-duration-totalQ-index` for database consistency.

---

## 🔮 Roadmap: The Future of Assessment

The current architecture handles objective (multiple-choice) testing with absolute precision. The next evolution of this platform will introduce **Hybrid AI Assessment**.

* **Subjective Testing Engine:** Transitioning beyond binary correct/incorrect paradigms to allow free-form text input, essays, and code compilation.
* **AI Model Checking:** Integration with advanced LLMs to evaluate subjective answers. The AI will cross-reference candidate input against grading rubrics, factual accuracy, and logical deduction, eliminating human bias.
* **Mixed-Mode Assessments:** Seamlessly blending objective data points (MCQs) with AI-evaluated subjective reasoning in a single, unified test run.
* **Deep Analytics:** Moving beyond simple scores to evaluate a candidate's thought process, identifying gaps in foundational logic versus simple factual recall.

---

## 🛠️ Installation & Setup

### 1. Environment Configuration
Ensure your Node environment and `.env` variables are configured (e.g., database credentials, port).

### 2. Database Initialization (Crucial)
The backend expects a specific MySQL table structure. If you encounter the `ER_NO_SUCH_TABLE` error for `tester.qna_tester`, execute the following SQL command in your database to instantiate the schema:

```sql
CREATE DATABASE IF NOT EXISTS tester;
USE tester;

CREATE TABLE qna_tester (
    id VARCHAR(150) PRIMARY KEY,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    users_access JSON NOT NULL,
    answer TEXT NOT NULL
);

3. Execution

Start the server using standard node commands or nodemon for development:
Bash

npm install
nodemon index.js

The server will boot and listen on http://localhost:3000 (or your defined port).
📂 File Structure

    server/index.js - Main Express server and API routing.

    server/views/qna.ejs - The candidate-facing testing portal.

    server/views/test_maker.ejs - The administrative test builder interface.

    server/public/js/ - Client-side logic for DOM manipulation and API communication (qna.js, test_make.js).

⚖️ Philosophy

This platform is built on the premise that assessments should be a reflection of reality. No bloated frameworks, no sweet lies, just efficient code evaluating raw knowledge.
