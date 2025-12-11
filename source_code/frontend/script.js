// CONFIGURATION
const API_URL =
  "https://cyxp8zul8c.execute-api.ap-south-1.amazonaws.com/get-upload-url";
const THUMB_BUCKET_URL =
  "https://cloudlens-g34-thumbnails.s3.ap-south-1.amazonaws.com";
const WATERMARK_BUCKET_URL =
  "https://cloudlens-g34-watermarked.s3.ap-south-1.amazonaws.com";

// THEME LOGIC
function toggleTheme() {
  const body = document.body;
  const moon = document.getElementById("moon-icon");
  const sun = document.getElementById("sun-icon");
  if (body.getAttribute("data-theme") === "dark") {
    body.removeAttribute("data-theme");
    moon.classList.remove("hidden");
    sun.classList.add("hidden");
    localStorage.setItem("theme", "light");
  } else {
    body.setAttribute("data-theme", "dark");
    moon.classList.add("hidden");
    sun.classList.remove("hidden");
    localStorage.setItem("theme", "dark");
  }
}
if (localStorage.getItem("theme") === "dark") {
  document.body.setAttribute("data-theme", "dark");
  document.getElementById("moon-icon").classList.add("hidden");
  document.getElementById("sun-icon").classList.remove("hidden");
}

// APP STATE
let currentMode = "watermark";
let selectedFiles = []; // Global array to store files

// MODE SWITCHING
function setMode(mode) {
  currentMode = mode;
  document
    .querySelectorAll(".mode-btn")
    .forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");

  const wInput = document.getElementById("input-watermark");
  const tInput = document.getElementById("input-thumbnail");
  const wInfo = document.getElementById("info-watermark");
  const tInfo = document.getElementById("info-thumbnail");

  if (mode === "watermark") {
    wInput.classList.remove("hidden");
    tInput.classList.add("hidden");
    wInfo.style.display = "block";
    tInfo.style.display = "none";
  } else {
    wInput.classList.add("hidden");
    tInput.classList.remove("hidden");
    wInfo.style.display = "none";
    tInfo.style.display = "block";
  }
  resetUI();
}

function resetUI() {
  document.getElementById("result-area").style.display = "none";
  document.getElementById("status").innerText = "";
  document.getElementById("progress-container").classList.add("hidden");
  document.getElementById("progress-bar").style.width = "0%";
  document.getElementById("safety-report").classList.add("hidden");
  document.getElementById("rejected-list").innerHTML = "";
}

// SMART PREVIEW LOGIC
function showFilePreview(event) {
  const newFiles = Array.from(event.target.files);

  // Add new files to our global list
  selectedFiles = selectedFiles.concat(newFiles);

  // Clear the input value so the same file can be selected again if needed
  event.target.value = "";

  updatePreviewUI();
  resetUI();
}

function updatePreviewUI() {
  const previewContainer = document.getElementById("preview-container");
  const singlePreview = document.getElementById("uploadPreview");
  const multiPreview = document.getElementById("multi-file-icon");
  const countSpan = document.getElementById("fileCount");
  const addMoreBtn = document.getElementById("addMoreBtn");

  // Reset hidden states
  previewContainer.classList.add("hidden");
  singlePreview.classList.add("hidden");
  multiPreview.classList.add("hidden");
  addMoreBtn.classList.add("hidden");

  if (selectedFiles.length === 0) return;

  previewContainer.classList.remove("hidden");

  if (selectedFiles.length === 1) {
    // SINGLE FILE: Show Image + Add More Button
    const src = URL.createObjectURL(selectedFiles[0]);
    singlePreview.src = src;
    singlePreview.classList.remove("hidden");
    addMoreBtn.classList.remove("hidden");
  } else {
    // MULTIPLE FILES: Show Folder Icon
    countSpan.innerText = selectedFiles.length;
    multiPreview.classList.remove("hidden");
    addMoreBtn.innerText = "+ Add More";
    addMoreBtn.classList.remove("hidden");
  }
}

// BATCH PROCESSING
async function processBatch() {
  const files = selectedFiles;
  const btn = document.getElementById("uploadBtn");
  const status = document.getElementById("status");
  const progressBar = document.getElementById("progress-bar");
  const progressContainer = document.getElementById("progress-container");
  const rejectedList = document.getElementById("rejected-list");
  const safetyReport = document.getElementById("safety-report");

  // Validation
  if (files.length === 0) {
    status.style.color = "var(--text-sub)";
    status.innerText = "Please select at least one file.";
    return;
  }

  let customData = {};
  if (currentMode === "watermark") {
    const text = document.getElementById("customText").value.trim();
    if (text.length === 0 || text.length > 10) {
      status.style.color = "#ef4444";
      status.innerText = "Error: Text must be 1-10 characters.";
      return;
    }
    customData.customText = text;
  } else {
    const size = document.getElementById("customSize").value;
    if (size < 50 || size > 1000) {
      status.style.color = "#ef4444";
      status.innerText = "Error: Size must be 50-1000px.";
      return;
    }
    customData.customSize = size;
  }

  // Setup UI
  btn.disabled = true;
  btn.innerText = "Processing...";
  status.innerText = `Preparing ${files.length} file(s)...`;
  status.style.color = "var(--primary)";
  progressContainer.classList.remove("hidden");
  progressBar.style.width = "5%";
  progressBar.style.backgroundColor = "#10b981";

  safetyReport.classList.add("hidden");
  rejectedList.innerHTML = "";

  const zip = new JSZip();
  let successCount = 0;
  let rejectedFiles = [];
  let lastBlob = null;
  let lastFileName = "";

  // Process files sequentially
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const percent = Math.round(((i + 1) / files.length) * 100);
    status.innerText = `Processing file ${i + 1}/${
      files.length
    } (${percent}%): ${file.name}`;

    try {
      const blob = await processSingleFile(file, customData);
      if (blob) {
        zip.file(`processed_${file.name}`, blob);
        lastBlob = blob;
        lastFileName = `processed_${file.name}`;
        successCount++;
      }
    } catch (err) {
      if (err.message.includes("SAFETY_BLOCK")) {
        rejectedFiles.push(file.name);
      }
    }
    progressBar.style.width = `${percent}%`;
  }

  // Handle Safety Report
  if (rejectedFiles.length > 0) {
    safetyReport.classList.remove("hidden");
    rejectedFiles.forEach((name) => {
      const li = document.createElement("li");
      li.innerText = `${name} (Removed: Inappropriate content)`;
      rejectedList.appendChild(li);
    });
  }

  // Finish
  if (successCount > 0) {
    document.getElementById("successCount").innerText = successCount;
    document.getElementById("result-area").style.display = "block";
    status.innerText = "✅ Completed!";
    status.style.color = "#10b981";

    const dlZipBtn = document.getElementById("downloadZipBtn");
    const dlSingleBtn = document.getElementById("downloadSingleBtn");
    const resultImg = document.getElementById("resultImg");

    if (files.length === 1 && successCount === 1) {
      // SINGLE FILE MODE
      dlZipBtn.classList.add("hidden");
      dlSingleBtn.classList.remove("hidden");

      const url = URL.createObjectURL(lastBlob);
      resultImg.src = url;
      resultImg.classList.remove("hidden");

      dlSingleBtn.href = url;
      dlSingleBtn.download = lastFileName;
    } else {
      // BATCH MODE
      status.innerText = "Zipping files...";
      const zipContent = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipContent);

      resultImg.classList.add("hidden");
      dlSingleBtn.classList.add("hidden");
      dlZipBtn.classList.remove("hidden");

      dlZipBtn.href = zipUrl;
      dlZipBtn.download = `CloudLens_Batch_${Date.now()}.zip`;
      status.innerText = "✅ Batch Completed!";
    }

    // Clear list
    selectedFiles = [];
    document.getElementById("customText").value = "";
    document.getElementById("preview-container").classList.add("hidden");
  } else {
    status.innerText = "⚠️ All files were rejected by safety filter or failed.";
    status.style.color = "#ef4444";
    // Clear list on failure too
    selectedFiles = [];
  }

  btn.disabled = false;
  btn.innerText = "Start Processing";
}

// Helper
async function processSingleFile(file, customData) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        type: file.type,
        action: currentMode,
        ...customData,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    const headers = { "Content-Type": file.type };
    if (currentMode === "watermark")
      headers["x-amz-meta-custom-text"] = customData.customText;
    if (currentMode === "thumbnail")
      headers["x-amz-meta-custom-size"] = customData.customSize.toString();

    const upload = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: headers,
      body: file,
    });

    if (!upload.ok) return null;

    const objectName = data.key.split("/")[1];
    const bucketUrl =
      currentMode === "watermark" ? WATERMARK_BUCKET_URL : THUMB_BUCKET_URL;
    const finalUrl = `${bucketUrl}/${objectName}`;

    await pollForResult(finalUrl);

    const imgRes = await fetch(finalUrl);
    return await imgRes.blob();
  } catch (error) {
    if (error.message.includes("SAFETY_BLOCK")) {
      throw error;
    }
    return null;
  }
}

async function pollForResult(url) {
  let attempts = 0;
  await new Promise((r) => setTimeout(r, 2000));

  while (attempts < 20) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (res.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
  }
  throw new Error("SAFETY_BLOCK");
}
