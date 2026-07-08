// ============================================================
// Q/A Test Builder — client logic
// Both flows (manual + json) end by POSTing the same payload shape
// to /api/save-test, where the server builds ids + SQL + inserts.
// ============================================================

const API_URL = "/api/save-test";

function slugify(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function el(id) {
  return document.getElementById(id);
}

function showToast(title, body, isError) {
  const t = el("toast");
  el("toast-title").textContent = title;
  el("toast-title").style.color = isError ? "#b5493a" : "#2c6a61";
  el("toast-body").innerHTML = body;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 8000);
}

function renderMessages(listEl, errors, okMessage) {
  listEl.innerHTML = "";
  if (errors && errors.length) {
    errors.forEach((e) => {
      const li = document.createElement("li");
      li.className = "err";
      li.textContent = e;
      listEl.appendChild(li);
    });
    return false;
  }
  if (okMessage) {
    const li = document.createElement("li");
    li.className = "ok";
    li.textContent = okMessage;
    listEl.appendChild(li);
  }
  return true;
}

// ---------- generic chip (tag) input ----------
function makeChipInput(boxEl, inputEl, arr, onChange) {
  function render() {
    boxEl.querySelectorAll(".chip").forEach((c) => c.remove());
    arr.forEach((val, idx) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${escapeHtml(val)} <button type="button" data-idx="${idx}">&times;</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        arr.splice(idx, 1);
        render();
        if (onChange) onChange();
      });
      boxEl.insertBefore(chip, inputEl);
    });
  }
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = inputEl.value.trim().replace(/,$/, "");
      if (val && !arr.includes(val)) {
        arr.push(val);
        render();
        if (onChange) onChange();
      }
      inputEl.value = "";
    } else if (e.key === "Backspace" && !inputEl.value && arr.length) {
      arr.pop();
      render();
      if (onChange) onChange();
    }
  });
  render();
  return render;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    el(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ============================================================
// MANUAL FLOW
// ============================================================
const manual = {
  testName: "",
  duration: null,
  total: null,
  usersAccess: [],
  questions: [], // { q, options, a }
  currentOptions: ["", ""],
  currentAnswerIdx: 0,
};

function updateManualIdPreview() {
  manual.testName = el("m-testname").value;
  manual.duration = Number(el("m-duration").value);
  manual.total = Number(el("m-total").value);

  const clean = slugify(manual.testName);
  const validDuration = Number.isInteger(manual.duration) && manual.duration > 0;
  const validTotal = Number.isInteger(manual.total) && manual.total > 0;
  const ready = clean && validDuration && validTotal;

  el("m-id-preview").textContent = ready
    ? `${clean}-${manual.duration}-${manual.total}-1 … ${clean}-${manual.duration}-${manual.total}-${manual.total}`
    : "id prefix will appear here…";

  el("m-continue-step1").disabled = !ready;
}
["m-testname", "m-duration", "m-total"].forEach((id) =>
  el(id).addEventListener("input", updateManualIdPreview)
);

el("m-continue-step1").addEventListener("click", () => {
  el("step2-card").style.display = "block";
  el("step2-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

makeChipInput(el("m-users-chipbox"), el("m-users-input"), manual.usersAccess);

el("m-start-questions").addEventListener("click", () => {
  el("step3-card").style.display = "block";
  el("step3-card").scrollIntoView({ behavior: "smooth", block: "start" });
  renderManualOptionRows();
  updateManualQuestionHeader();
});

function updateManualQuestionHeader() {
  const n = manual.questions.length + 1;
  el("m-progress").textContent = `Question ${n} / ${manual.total}`;
  const clean = slugify(manual.testName);
  el("m-current-id").textContent = `${clean}-${manual.duration}-${manual.total}-${n}`;
}

function renderManualOptionRows() {
  const wrap = el("m-options-list");
  wrap.innerHTML = "";
  manual.currentOptions.forEach((val, idx) => {
    const row = document.createElement("div");
    row.className = "option-row";
    row.innerHTML = `
      <input type="radio" name="m-correct" ${manual.currentAnswerIdx === idx ? "checked" : ""} data-idx="${idx}" />
      <input type="text" value="${escapeHtml(val)}" placeholder="option ${idx + 1}" data-idx="${idx}" />
      ${manual.currentOptions.length > 2 ? `<button type="button" class="remove-opt" data-idx="${idx}">&times;</button>` : ""}
    `;
    row.querySelector('input[type=radio]').addEventListener("change", () => {
      manual.currentAnswerIdx = idx;
    });
    row.querySelector('input[type=text]').addEventListener("input", (e) => {
      manual.currentOptions[idx] = e.target.value;
    });
    const rm = row.querySelector(".remove-opt");
    if (rm) {
      rm.addEventListener("click", () => {
        manual.currentOptions.splice(idx, 1);
        if (manual.currentAnswerIdx >= manual.currentOptions.length) manual.currentAnswerIdx = 0;
        renderManualOptionRows();
      });
    }
    wrap.appendChild(row);
  });
}

el("m-add-option").addEventListener("click", () => {
  manual.currentOptions.push("");
  renderManualOptionRows();
});

el("m-add-question").addEventListener("click", () => {
  const qText = el("m-qtext").value.trim();
  const options = manual.currentOptions.map((o) => o.trim()).filter(Boolean);

  if (!qText) return showToast("Missing question", "Enter the question text first.", true);
  if (options.length < 2) return showToast("Not enough options", "Add at least 2 non-empty options.", true);
  if (manual.currentAnswerIdx >= options.length) manual.currentAnswerIdx = 0;
  const answer = options[manual.currentAnswerIdx];

  manual.questions.push({ q: qText, options, a: answer });

  // reset inputs for next question
  el("m-qtext").value = "";
  manual.currentOptions = ["", ""];
  manual.currentAnswerIdx = 0;
  renderManualOptionRows();
  renderManualAddedList();

  if (manual.questions.length >= manual.total) {
    el("m-add-question").disabled = true;
    el("m-qtext").disabled = true;
    el("m-add-option").disabled = true;
    showStep4();
  } else {
    updateManualQuestionHeader();
  }
});

function renderManualAddedList() {
  const wrap = el("m-added-list");
  wrap.innerHTML = "";
  const clean = slugify(manual.testName);
  manual.questions.forEach((qq, i) => {
    const div = document.createElement("div");
    div.className = "q-summary-item";
    div.innerHTML = `
      <button class="del" data-idx="${i}">remove</button>
      <div class="qid">${clean}-${manual.duration}-${manual.total}-${i + 1}</div>
      <div>${escapeHtml(qq.q)}</div>
      <div class="qa">answer: ${escapeHtml(qq.a)}</div>
    `;
    div.querySelector(".del").addEventListener("click", () => {
      manual.questions.splice(i, 1);
      renderManualAddedList();
      el("m-add-question").disabled = false;
      el("m-qtext").disabled = false;
      el("m-add-option").disabled = false;
      el("step4-card").style.display = "none";
      updateManualQuestionHeader();
    });
    wrap.appendChild(div);
  });
}

function showStep4() {
  el("m-count-label").textContent = manual.questions.length;
  el("step4-card").style.display = "block";
  el("step4-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

el("m-submit").addEventListener("click", async () => {
  const payload = {
    testName: manual.testName,
    duration: manual.duration,
    totalQuestions: manual.total,
    usersAccess: manual.usersAccess,
    questions: manual.questions,
  };
  el("m-submit").disabled = true;
  el("m-submit").textContent = "Submitting…";
  const result = await submitPayload(payload);
  el("m-submit").disabled = false;
  el("m-submit").textContent = "Submit to server";
  renderMessages(
    el("m-messages"),
    result.success ? null : result.errors,
    result.success ? `Saved ${result.count} question(s) under "${result.baseId}".` : null
  );
});

// ============================================================
// JSON FLOW
// ============================================================
const jsonState = {
  payload: null, // normalized {testName,duration,totalQuestions,usersAccess,questions}
  needsUsers: false,
};

el("j-drop").addEventListener("click", () => el("j-file").click());
el("j-drop").addEventListener("dragover", (e) => {
  e.preventDefault();
  el("j-drop").classList.add("drag");
});
el("j-drop").addEventListener("dragleave", () => el("j-drop").classList.remove("drag"));
el("j-drop").addEventListener("drop", (e) => {
  e.preventDefault();
  el("j-drop").classList.remove("drag");
  const file = e.dataTransfer.files[0];
  if (file) readFileIntoTextarea(file);
});
el("j-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) readFileIntoTextarea(file);
});
function readFileIntoTextarea(file) {
  const reader = new FileReader();
  reader.onload = () => (el("j-textarea").value = reader.result);
  reader.readAsText(file);
}

// Detects legacy id-keyed format: { "name-90-4-1": {q,options,a}, ... }
function tryParseLegacyFormat(obj) {
  const keys = Object.keys(obj);
  const re = /^(.+)-(\d+)-(\d+)-(\d+)$/;
  const matches = keys.map((k) => ({ key: k, m: k.match(re) }));
  if (!matches.length || matches.some((x) => !x.m)) return null;

  const [, testName, duration, total] = matches[0].m;
  // all keys must share the same testName/duration/total
  const consistent = matches.every(
    (x) => x.m[1] === testName && x.m[2] === duration && x.m[3] === total
  );
  if (!consistent) return null;

  const ordered = matches
    .map((x) => ({ idx: Number(x.m[4]), data: obj[x.key] }))
    .sort((a, b) => a.idx - b.idx);

  const questions = ordered.map((o) => ({
    q: o.data.q,
    options: o.data.options,
    a: o.data.a,
  }));

  return {
    testName,
    duration: Number(duration),
    totalQuestions: Number(total),
    usersAccess: undefined, // must be collected separately
    questions,
  };
}

function normalizeJsonInput(raw) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    return { errors: [`Invalid JSON: ${e.message}`] };
  }

  if (obj && Array.isArray(obj.questions)) {
    // structured format
    return {
      normalized: {
        testName: obj.testName,
        duration: Number(obj.duration),
        totalQuestions: Number(obj.totalQuestions),
        usersAccess: Array.isArray(obj.usersAccess) ? obj.usersAccess : undefined,
        questions: obj.questions,
      },
    };
  }

  const legacy = tryParseLegacyFormat(obj || {});
  if (legacy) return { normalized: legacy };

  return {
    errors: [
      'Could not recognize the format. Use either {"testName","duration","totalQuestions","usersAccess","questions":[...]} or the legacy id-keyed object shown above.',
    ],
  };
}

function validateNormalized(n) {
  const errors = [];
  if (!n.testName || typeof n.testName !== "string") errors.push("testName is required.");
  if (!Number.isInteger(n.duration) || n.duration <= 0) errors.push("duration must be a positive whole number.");
  if (!Number.isInteger(n.totalQuestions) || n.totalQuestions <= 0)
    errors.push("totalQuestions must be a positive whole number.");
  if (!Array.isArray(n.questions) || !n.questions.length) {
    errors.push("questions must be a non-empty array.");
  } else {
    if (n.questions.length !== n.totalQuestions) {
      errors.push(`totalQuestions is ${n.totalQuestions} but ${n.questions.length} question(s) were found.`);
    }
    n.questions.forEach((q, i) => {
      const num = i + 1;
      if (!q || typeof q.q !== "string" || !q.q.trim()) errors.push(`Question ${num}: missing "q".`);
      if (!Array.isArray(q.options) || q.options.length < 2)
        errors.push(`Question ${num}: "options" needs at least 2 entries.`);
      if (!q.a || (Array.isArray(q.options) && !q.options.includes(q.a)))
        errors.push(`Question ${num}: "a" must match one of the options.`);
    });
  }
  return errors;
}

el("j-validate").addEventListener("click", () => {
  const raw = el("j-textarea").value.trim();
  if (!raw) return renderMessages(el("j-messages"), ["Paste or upload a JSON file first."]);

  const { normalized, errors } = normalizeJsonInput(raw);
  if (errors) return renderMessages(el("j-messages"), errors);

  const validationErrors = validateNormalized(normalized);
  if (validationErrors.length) return renderMessages(el("j-messages"), validationErrors);

  jsonState.payload = normalized;
  renderMessages(el("j-messages"), null, `Looks good — ${normalized.questions.length} question(s) parsed.`);

  if (!Array.isArray(normalized.usersAccess)) {
    jsonState.needsUsers = true;
    el("j-users-card").style.display = "block";
    el("j-submit-card").style.display = "none";
  } else {
    jsonState.needsUsers = false;
    el("j-users-card").style.display = "none";
    showJsonSubmitCard();
  }
});

const jsonUsersAccess = [];
const renderJsonChips = makeChipInput(el("j-users-chipbox"), el("j-users-input"), jsonUsersAccess, () => {
  if (jsonUsersAccess.length) showJsonSubmitCard();
});

function showJsonSubmitCard() {
  const n = jsonState.payload;
  const clean = slugify(n.testName);
  el("j-summary").textContent = `${n.questions.length} question(s) → ids ${clean}-${n.duration}-${n.totalQuestions}-1 … ${n.totalQuestions}`;
  el("j-submit-card").style.display = "block";
  el("j-submit-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

el("j-submit").addEventListener("click", async () => {
  const payload = { ...jsonState.payload };
  if (jsonState.needsUsers) payload.usersAccess = jsonUsersAccess;

  el("j-submit").disabled = true;
  el("j-submit").textContent = "Submitting…";
  const result = await submitPayload(payload);
  el("j-submit").disabled = false;
  el("j-submit").textContent = "Submit to server";

  if (result.success) {
    showToast("Saved", `Inserted ${result.count} row(s) under <b>${result.baseId}</b>.`);
  } else {
    showToast("Failed", (result.errors || ["Unknown error"]).join("<br/>"), true);
  }
});

// ---------- shared submit ----------
async function submitPayload(payload) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, errors: data.errors || ["Request failed."] };
    return data;
  } catch (e) {
    return { success: false, errors: [`Network error: ${e.message}`] };
  }
}