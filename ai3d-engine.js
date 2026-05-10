// ═══════════════════════════════════════════════════════════════
// ARMENU — AI 3D AUTO-GENERATION ENGINE
// ═══════════════════════════════════════════════════════════════
// Supports 5 AI tools with auto-fallback:
//   1. Meshy.ai     — 150 free/month
//   2. Tripo3D      — 50 free/month
//   3. Luma AI      — 30 free/month
//   4. Spline AI    — 20 free/month
//   5. CSM 3D       — 20 free/month (bonus!)
// Total: 270 free 3D models/month = ₹0 cost for 270 dishes!
// ═══════════════════════════════════════════════════════════════

import { getFirestore, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ── Load API keys from Firestore admin settings ──
async function getApiKeys(db) {
  try {
    const snap = await getDoc(doc(db, "admin_settings", "ai_tools"));
    return snap.exists() ? snap.data() : {};
  } catch(e) {
    console.warn("Could not load API keys:", e.message);
    return {};
  }
}

// ── Track usage per tool ──
async function trackUsage(db, toolName) {
  try {
    const ref = doc(db, "admin_settings", "ai_usage");
    await updateDoc(ref, { [toolName]: increment(1) });
  } catch(e) {}
}

// ═══════════════════════════════════════
// TOOL 1: MESHY.AI — 150 free/month
// ═══════════════════════════════════════
async function generateWithMeshy(imageUrl, apiKey, onStatus) {
  if (!apiKey) throw new Error("No Meshy API key");
  onStatus("🤖 Meshy.ai: Uploading image...");

  // Step 1: Create task
  const res = await fetch("https://api.meshy.ai/v1/image-to-3d", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, enable_pbr: true, ai_model: "meshy-4" })
  });
  if (!res.ok) throw new Error(`Meshy error: ${res.status}`);
  const { result: taskId } = await res.json();

  // Step 2: Poll for result
  onStatus("🤖 Meshy.ai: Generating 3D mesh (2-5 min)...");
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const poll = await fetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const data = await poll.json();
    if (data.status === "SUCCEEDED") {
      onStatus("✅ Meshy.ai: 3D model ready!");
      return { url: data.model_urls?.glb, tool: "Meshy.ai", taskId };
    }
    if (data.status === "FAILED") throw new Error("Meshy generation failed");
    onStatus(`🤖 Meshy.ai: Processing... ${data.progress || 0}%`);
  }
  throw new Error("Meshy timeout");
}

// ═══════════════════════════════════════
// TOOL 2: TRIPO3D — 50 free/month
// ═══════════════════════════════════════
async function generateWithTripo3D(imageUrl, apiKey, onStatus) {
  if (!apiKey) throw new Error("No Tripo3D API key");
  onStatus("⚡ Tripo3D: Uploading image...");

  const res = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "image_to_model", file: { type: "jpg", url: imageUrl } })
  });
  if (!res.ok) throw new Error(`Tripo3D error: ${res.status}`);
  const { data: { task_id } } = await res.json();

  onStatus("⚡ Tripo3D: Generating model...");
  for (let i = 0; i < 40; i++) {
    await sleep(6000);
    const poll = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${task_id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const { data } = await poll.json();
    if (data.status === "success") {
      onStatus("✅ Tripo3D: 3D model ready!");
      return { url: data.output?.model, tool: "Tripo3D", taskId: task_id };
    }
    if (data.status === "failed") throw new Error("Tripo3D generation failed");
    onStatus(`⚡ Tripo3D: Processing... ${Math.round(data.progress||0)}%`);
  }
  throw new Error("Tripo3D timeout");
}

// ═══════════════════════════════════════
// TOOL 3: LUMA AI — 30 free/month
// ═══════════════════════════════════════
async function generateWithLuma(imageUrl, apiKey, onStatus) {
  if (!apiKey) throw new Error("No Luma API key");
  onStatus("🌟 Luma AI: Creating generation...");

  const res = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations/image-to-3d", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl })
  });
  if (!res.ok) throw new Error(`Luma error: ${res.status}`);
  const { id } = await res.json();

  onStatus("🌟 Luma AI: Processing...");
  for (let i = 0; i < 50; i++) {
    await sleep(6000);
    const poll = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const data = await poll.json();
    if (data.state === "completed") {
      onStatus("✅ Luma AI: 3D model ready!");
      return { url: data.assets?.glb, tool: "Luma AI", taskId: id };
    }
    if (data.state === "failed") throw new Error("Luma generation failed");
    onStatus(`🌟 Luma AI: ${data.state}...`);
  }
  throw new Error("Luma timeout");
}

// ═══════════════════════════════════════
// TOOL 4: SPLINE AI — 20 free/month
// ═══════════════════════════════════════
async function generateWithSpline(imageUrl, apiKey, onStatus) {
  if (!apiKey) throw new Error("No Spline API key");
  onStatus("🎨 Spline AI: Processing image...");

  const res = await fetch("https://api.spline.design/v1/image-to-3d", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, format: "glb" })
  });
  if (!res.ok) throw new Error(`Spline error: ${res.status}`);
  const { jobId } = await res.json();

  onStatus("🎨 Spline AI: Generating...");
  for (let i = 0; i < 30; i++) {
    await sleep(8000);
    const poll = await fetch(`https://api.spline.design/v1/jobs/${jobId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const data = await poll.json();
    if (data.status === "done") {
      onStatus("✅ Spline AI: Model ready!");
      return { url: data.outputUrl, tool: "Spline AI", taskId: jobId };
    }
    if (data.status === "error") throw new Error("Spline generation failed");
  }
  throw new Error("Spline timeout");
}

// ═══════════════════════════════════════
// TOOL 5: CSM 3D — 20 free/month
// ═══════════════════════════════════════
async function generateWithCSM(imageUrl, apiKey, onStatus) {
  if (!apiKey) throw new Error("No CSM API key");
  onStatus("🔮 CSM 3D: Uploading...");

  const res = await fetch("https://api.csm.ai/image-to-3d-sessions", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, mesh_format: "glb", geometry_file_format: "glb" })
  });
  if (!res.ok) throw new Error(`CSM error: ${res.status}`);
  const { session_code } = await res.json();

  onStatus("🔮 CSM 3D: Processing mesh...");
  for (let i = 0; i < 40; i++) {
    await sleep(8000);
    const poll = await fetch(`https://api.csm.ai/image-to-3d-sessions/${session_code}`, {
      headers: { "x-api-key": apiKey }
    });
    const data = await poll.json();
    if (data.status === "completed") {
      onStatus("✅ CSM 3D: Model ready!");
      return { url: data.mesh_url_glb, tool: "CSM 3D", taskId: session_code };
    }
    if (data.status === "failed") throw new Error("CSM generation failed");
    onStatus(`🔮 CSM 3D: ${data.status}...`);
  }
  throw new Error("CSM timeout");
}

// ═══════════════════════════════════════
// MASTER AUTO-GENERATE FUNCTION
// Tries all tools in priority order
// ═══════════════════════════════════════
export async function autoGenerate3D(imageUrl, db, onStatus, onProgress) {
  const keys = await getApiKeys(db);

  // Tool list in priority order (admin can reorder in Admin Panel)
  const tools = [
    { name: "meshy",  label: "Meshy.ai",  limit: 150, fn: generateWithMeshy,  key: keys.meshy_key  },
    { name: "tripo",  label: "Tripo3D",   limit: 50,  fn: generateWithTripo3D, key: keys.tripo_key  },
    { name: "luma",   label: "Luma AI",   limit: 30,  fn: generateWithLuma,   key: keys.luma_key   },
    { name: "spline", label: "Spline AI", limit: 20,  fn: generateWithSpline, key: keys.spline_key },
    { name: "csm",    label: "CSM 3D",    limit: 20,  fn: generateWithCSM,    key: keys.csm_key    }
  ];

  // Check usage limits from Firestore
  let usageData = {};
  try {
    const usageSnap = await getDoc(doc(db, "admin_settings", "ai_usage"));
    if (usageSnap.exists()) usageData = usageSnap.data();
  } catch(e) {}

  const now = new Date();
  const monthKey = `${now.getFullYear()}_${now.getMonth()}`;

  for (const tool of tools) {
    if (!tool.key) {
      onStatus(`⏭️ ${tool.label}: No API key — skipping`);
      continue;
    }

    const usageKey = `${tool.name}_${monthKey}`;
    const used = usageData[usageKey] || 0;

    if (used >= tool.limit) {
      onStatus(`⏭️ ${tool.label}: Free limit reached (${used}/${tool.limit}) — trying next tool`);
      continue;
    }

    onStatus(`🔄 Trying ${tool.label} (${used}/${tool.limit} used this month)...`);
    onProgress(10);

    try {
      const result = await tool.fn(imageUrl, tool.key, onStatus);
      // Track usage
      await trackUsage(db, `${tool.name}_${monthKey}`);
      onProgress(100);
      return { ...result, usedTool: tool.label, usageAfter: used + 1, limit: tool.limit };
    } catch(err) {
      onStatus(`❌ ${tool.label} failed: ${err.message} — trying next...`);
      onProgress(0);
    }
  }

  // All tools failed or no keys — return manual upload prompt
  return { error: true, message: "All AI tools failed or no API keys set. Please upload 3D model manually." };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
