const express = require("express");
const path=require('path');
require('dotenv').config(); 
const cors = require("cors");
const mysql = require("mysql2/promise");


const app=express();
const PORT=process.env.PORT|| 3000;
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));
 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.static(path.join(__dirname,'..', 'public')));

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'..','public','login_page.html'));

})

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "souravdp",
  database: process.env.DB_NAME || "tester",
  waitForConnections: true,
  connectionLimit: 10,
});


function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ""); // keep ids clean, no dashes/spaces inside the name itself
}




function validatePayload(body) {
  const errors = [];
 
  const { testName, duration, totalQuestions, usersAccess, questions } = body || {};
 
  if (!testName || typeof testName !== "string" || !testName.trim()) {
    errors.push("testName is required (string).");
  }
 
  const durationNum = Number(duration);
  if (!Number.isInteger(durationNum) || durationNum <= 0) {
    errors.push("duration must be a positive whole number (minutes).");
  }
 
  const totalNum = Number(totalQuestions);
  if (!Number.isInteger(totalNum) || totalNum <= 0) {
    errors.push("totalQuestions must be a positive whole number.");
  }
 
  if (!Array.isArray(usersAccess)) {
    errors.push("usersAccess must be an array of user ids (can be empty []).");
  }
 
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push("questions must be a non-empty array.");
  } else {
    if (Number.isInteger(totalNum) && questions.length !== totalNum) {
      errors.push(
        `totalQuestions is ${totalNum} but ${questions.length} question(s) were provided.`
      );
    }
    questions.forEach((qq, i) => {
      const n = i + 1;
      if (!qq || typeof qq.q !== "string" || !qq.q.trim()) {
        errors.push(`Question ${n}: "q" (question text) is required.`);
      }
      if (!Array.isArray(qq.options) || qq.options.length < 2) {
        errors.push(`Question ${n}: "options" must be an array of at least 2 choices.`);
      }
      if (typeof qq.a !== "string" || !qq.a.trim()) {
        errors.push(`Question ${n}: "a" (answer) is required.`);
      } else if (Array.isArray(qq.options) && !qq.options.includes(qq.a)) {
        errors.push(`Question ${n}: answer "${qq.a}" must exactly match one of the options.`);
      }
    });
  }
 
  return { errors, durationNum, totalNum };
}
 
// ---------- routes ----------
 
// Accepts either:
//  { testName, duration, totalQuestions, usersAccess: [...], questions: [{q, options, a}, ...] }
app.post("/api/save-test", async (req, res) => {
  const { errors, durationNum, totalNum } = validatePayload(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }
 
  const { testName, usersAccess, questions } = req.body;
  const cleanName = slugify(testName);
  if (!cleanName) {
    return res.status(400).json({ success: false, errors: ["testName produced an empty id after cleanup."] });
  }
 
  const baseId = `${cleanName}-${durationNum}-${totalNum}`;
  const rows = questions.map((qq, i) => {
    const id = `${baseId}-${i + 1}`;
    return [id, qq.q.trim(), JSON.stringify(qq.options), JSON.stringify(usersAccess), qq.a];
  });
 
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
 
    const sql = `
      INSERT INTO qna_tester (id, question, options, users_access, answer)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        question = VALUES(question),
        options = VALUES(options),
        users_access = VALUES(users_access),
        answer = VALUES(answer)
    `;
    await conn.query(sql, [rows]);
 
    await conn.commit();
    res.json({
      success: true,
      baseId,
      insertedIds: rows.map((r) => r[0]),
      count: rows.length,
    });
  } catch (err) {
    await conn.rollback();
    console.error("DB write failed:", err);
    res.status(500).json({ success: false, errors: [err.message] });
  } finally {
    conn.release();
  }
});
 
app.get("/api/test/:baseId", async (req, res) => {
  const { baseId } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM qna_tester WHERE id LIKE ? ORDER BY id",
      [`${baseId}-%`]
    );
    res.json({ success: true, rows });
  } catch (err) {
    res.status(500).json({ success: false, errors: [err.message] });
  }
});
 



app.get('/qna', (req, res) => {
    // res.render takes the name of the file (without .ejs) and an object of dynamic data
    res.render('qna', { 
        title: 'Dynamic Express Server', 
        message: 'This text was injected from the server!',
        currentTime: new Date().toLocaleTimeString()
    });
});
app.get('/test_make/:id', (req, res) => {
    if (!process.env.sp_pass) {
        return res.status(500).send('Server configuration error.');
    }

    if (process.env.sp_pass === req.params.id) {
        return res.render('test_maker');
    }
    
   return res.status(403).send('Access Denied: Invalid ID');
});


app.listen(PORT,()=>{
    console.log(`Server is running and listening on http://localhost:${PORT}`)
})