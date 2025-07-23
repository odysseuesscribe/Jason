let isPaused = false;
let allVoices = [];
let currentUtterance = null;
let voiceRate = 1; // Default speed


const style = document.createElement('style');
style.textContent = `
  td.reading-cell {
    background-color: yellow !important;
    transition: background-color 0.3s ease-in-out;
  }
`;
document.head.appendChild(style);


function assignCoordinates() {
  const table = document.getElementById("wordTable");
  for (let row = 1; row < table.rows.length; row++) {
    for (let col = 0; col < table.rows[row].cells.length; col++) {
      table.rows[row].cells[col].setAttribute("data-coord", `${row},${col + 1}`);
    }
  }
}

function highlightCell(coord) {
  document.querySelectorAll('[data-coord]').forEach(cell => {
    cell.classList.remove('reading-cell');
  });
  const cell = document.querySelector(`[data-coord="${coord}"]`);
  if (cell) {
    cell.classList.add('reading-cell');
  }
}

function populateVoiceOptions() {
  allVoices = speechSynthesis.getVoices();
  const spanishSelect = document.getElementById("spanishVoice");
  const englishSelect = document.getElementById("englishVoice");

  spanishSelect.innerHTML = "";
  englishSelect.innerHTML = "";

  allVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;

    if (voice.lang.startsWith("es")) {
      spanishSelect.appendChild(option.cloneNode(true));
    }

    if (voice.lang.startsWith("en")) {
      englishSelect.appendChild(option.cloneNode(true));
    }
  });
}

speechSynthesis.onvoiceschanged = populateVoiceOptions;

// New: Wait until unpaused before continuing
function waitUntilResumed(callback) {
  if (!isPaused) {
    callback();
  } else {
    const interval = setInterval(() => {
      if (!isPaused) {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }
}







function speak(text, lang, callback) {
  waitUntilResumed(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const selectedVoiceName = lang.startsWith("es")
      ? document.getElementById("spanishVoice").value
      : document.getElementById("englishVoice").value;

    const voice = allVoices.find(v => v.name === selectedVoiceName);
    if (voice) utterance.voice = voice;

    utterance.rate = voiceRate; // <<< THIS LINE ADDED

    utterance.onend = callback;
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
  });
}


document.getElementById("voiceSpeed").addEventListener("input", function () {
  voiceRate = parseFloat(this.value);
  document.getElementById("speedDisplay").textContent = this.value + "x";
});


document.getElementById("voiceSpeed").addEventListener("input", function () {
  document.getElementById("speedValue").textContent = this.value;
});




function readRow(row, repeat, next) {
  let count = 0;

  function highlight(cellIndex) {
    if (!row) return;
    [...row.cells].forEach(c => c.classList.remove("reading-cell"));
    if (row.cells[cellIndex]) row.cells[cellIndex].classList.add("reading-cell");
  }

  function repeatRow() {
    if (count >= repeat) {
      [...row.cells].forEach(c => c.classList.remove("reading-cell"));
      next();
      return;
    }
    count++;

    const spanish = row.cells[0].innerText.trim();
    const english = row.cells[1].innerText.trim();

    highlight(0);
    speak(spanish, 'es-ES', () => {
      highlight(1);
      speak(english, 'en-GB', repeatRow);
    });
  }

  repeatRow();
}





function startReading() {
  startStopwatch(); // Start the stopwatch (this won't restart if already running)

  const table = document.getElementById('wordTable');
  assignCoordinates();

  const rows = Array.from(table.rows).slice(1); // skip header
  const repeat = parseInt(document.getElementById('repeatCount').value) || 1;

  const rowData = rows.map((tr, rowIdx) => {
    const cells = [];
    for (let col = 0; col < tr.cells.length; col++) {
      const coord = `${rowIdx + 1},${col + 1}`;
      const text = tr.cells[col].innerText.trim();
      if (text) {
        const lang = col === 0 ? 'es-ES' : 'en-GB'; // Customize per column
        cells.push({ coord, text, lang });
      }
    }
    return cells;
  });

  let rowIndex = 0;
  let repeatCount = 0;

  function playRow() {
    if (rowIndex >= rowData.length) return;

    const cells = rowData[rowIndex];
    let cellIndex = 0;

    function playNextCell() {
      if (cellIndex >= cells.length) {
        repeatCount++;
        if (repeatCount < repeat) {
          cellIndex = 0;
          playNextCell();
        } else {
          repeatCount = 0;
          rowIndex++;
          playRow();
        }
        return;
      }

      const { coord, text, lang } = cells[cellIndex++];
      highlightCell(coord);
      speak(text, lang, playNextCell);
    }

    playNextCell();
  }

  playRow();
}




function addRow() {
  const table = document.getElementById('wordTable');
  const newRow = table.insertRow();
  const spanishCell = newRow.insertCell();
  const englishCell = newRow.insertCell();
  spanishCell.contentEditable = "true";
  englishCell.contentEditable = "true";
  spanishCell.innerText = "";
  englishCell.innerText = "";
  assignCoordinates();
  updateRowNumbers();
}


function importFromRepeatedText(inputText) {
  const entries = inputText.split(",").map(e => e.trim()).filter(e => e.length > 0);
  const table = document.getElementById("wordTable");

  for (let i = 0; i < entries.length; i += 2) {
    const spanish = entries[i];
    const english = entries[i + 1] || "";
    const row = table.insertRow();
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    cell1.textContent = spanish;
    cell2.textContent = english;
    cell1.contentEditable = "true";
    cell2.contentEditable = "true";
  }
  assignCoordinates();
setTimeout(updateRowNumbers, 0);
}

function updateRowNumbers() {
  const table = document.getElementById("wordTable");
  const rowNumbers = document.getElementById("rowNumbers");
  rowNumbers.innerHTML = ""; // clear previous

  for (let i = 1; i < table.rows.length; i++) {
    const number = document.createElement("div");
    number.textContent = i;
    number.style.height = `${table.rows[i].offsetHeight}px`;
    number.style.lineHeight = `${table.rows[i].offsetHeight}px`;
    number.style.color = "#00ff00";
    number.style.fontFamily = "monospace";
    rowNumbers.appendChild(number);
  }
}

function saveNamedTable() {
  const name = document.getElementById('tableNameSave').value.trim();
  if (!name) return alert("Please enter a name to save the table.");
  const table = document.getElementById('wordTable');
  const data = [];
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const rowData = [];
    for (let j = 0; j < row.cells.length; j++) {
      rowData.push(row.cells[j].innerText.trim());
    }
    data.push(rowData);
  }
  localStorage.setItem('tableLibrary_' + name, JSON.stringify(data));
  alert("Table saved as: " + name);
}

function loadNamedTable() {
  const name = document.getElementById('tableNameLoad').value.trim();
  if (!name) return alert("Please enter a table name to load.");
  const saved = localStorage.getItem('tableLibrary_' + name);
  if (!saved) return alert("No table found with that name.");
  const data = JSON.parse(saved);
  const table = document.getElementById('wordTable');
  
  while (table.rows.length > 1) table.deleteRow(1);
  while (table.rows[0].cells.length < data[0].length) {
    const th = document.createElement("th");
    th.textContent = `Column ${table.rows[0].cells.length}`;
    table.rows[0].appendChild(th);
  }

  for (const rowData of data) {
    const row = table.insertRow();
    for (const cellText of rowData) {
      const cell = row.insertCell();
      cell.contentEditable = "true";
      cell.textContent = cellText;
    }
  }
}

function addColumn() {
  const table = document.getElementById("wordTable");
  const headerRow = table.rows[0];
  const newHeader = document.createElement("th");
  newHeader.textContent = "New Column";
  headerRow.appendChild(newHeader);
  for (let i = 1; i < table.rows.length; i++) {
    const newCell = table.rows[i].insertCell();
    newCell.contentEditable = "true";
    newCell.innerText = "";
  }
}

function populateVoices(selectElement) {
  const voices = speechSynthesis.getVoices();
  selectElement.innerHTML = "";
  voices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    selectElement.appendChild(option);
  });
}

speechSynthesis.onvoiceschanged = () => {
  populateVoices(document.getElementById("spanishVoice"));
  populateVoices(document.getElementById("englishVoice"));
};

function importFromRepeatedText(inputText) {  
  const entries = inputText.split(",").map(e => e.trim()).filter(e => e.length > 0);  
  const table = document.getElementById("wordTable");  
  
  for (let i = 0; i < entries.length; i += 2) {  
    const spanish = entries[i];  
    const english = entries[i + 1] || "";  
    const row = table.insertRow();  
    const cell1 = row.insertCell(0);  
    const cell2 = row.insertCell(1);  
    cell1.textContent = spanish;  
    cell2.textContent = english;  
    cell1.contentEditable = "true";  
    cell2.contentEditable = "true";  
  }  
}  

// stopwatchInterval
let stopwatchInterval;
let startTime;

function startStopwatch() {
  if (!stopwatchInterval) {
    startTime = Date.now();
    stopwatchInterval = setInterval(updateStopwatch, 1000);
  }
}

function updateStopwatch() {
  const elapsed = Date.now() - startTime;
  const totalSeconds = Math.floor(elapsed / 1000);

  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  document.getElementById("stopwatch").textContent = `Time: ${hours}:${minutes}:${seconds}`;
}

// Local user "database" stored in localStorage
function signUp() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert("Please provide both email and password.");
    return;
  }

  let users = JSON.parse(localStorage.getItem('users')) || {};

  if (users[email]) {
    alert("User already exists. Please log in.");
    return;
  }

  users[email] = { password }; // You can expand this object later
  localStorage.setItem('users', JSON.stringify(users));

  alert("Sign-up successful! You can now log in.");
}

function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  let users = JSON.parse(localStorage.getItem('users')) || {};

  if (!users[email] || users[email].password !== password) {
    alert("Invalid email or password.");
    return;
  }

  // Store logged in user
  localStorage.setItem('currentUser', email);
  sessionData.user = email;
  sessionData.loginTime = new Date().toISOString();
  sessionData.loginLocation = "unknown"; // Optional: Skip geolocation or use a free API
  alert(`Logged in as ${email}`);
}

function logout() {
  if (!localStorage.getItem('currentUser')) {
    alert("No user logged in.");
    return;
  }

  saveTableData(); // Save table state
  sendSessionData(); // Send to Formspree

  localStorage.removeItem('currentUser');
  alert("Logged out successfully.");
}


let sessionData = {
  user: null,
  loginTime: null,
  loginLocation: null,
  tableName: null,
  tableData: null,
  elapsedTime: null
};

function saveTableData() {
  const name = document.getElementById('tableNameSave').value.trim();
  const table = document.getElementById('wordTable');
  const data = [];

  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const rowData = [];
    for (let j = 0; j < row.cells.length; j++) {
      rowData.push(row.cells[j].innerText.trim());
    }
    data.push(rowData);
  }

  sessionData.tableName = name;
  sessionData.tableData = data;
}

function sendSessionData() {
  const elapsedTime = document.getElementById("stopwatch").textContent.replace('Time: ', '');
  sessionData.elapsedTime = elapsedTime;

  fetch("https://formspree.io/f/YOUR_FORM_ID", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  })
  .then(response => alert("Session data sent successfully!"))
  .catch(error => alert("Failed to send session data."));
}

window.addEventListener("unload", function() {
    // Collect the user's info
    const userName = currentUser ? currentUser.name : "Unknown User";
    const loginTime = currentUser ? currentUser.loginTime : "Unknown Time";
    const stopwatch = document.getElementById("stopwatch").textContent;

    // Collect the table data
    const table = document.getElementById("wordTable");
    let tableHTML = "";
    if (table) {
        tableHTML = table.outerHTML; // Full HTML snapshot of the table
    }

    // Build the data object
    const data = {
        userName: userName,
        loginTime: loginTime,
        timer: stopwatch,
        tableHTML: tableHTML
    };

    // Send the data to Formspree
    fetch("https://formspree.io/f/YOUR_FORM_ID", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }).catch(err => console.error("Formspree error:", err));
});











document.querySelector('button[onclick="window.location.href=\'2index.html\'"]').addEventListener('click', function() {
  window.location.href = '2index.html';
});
















function exportToRepeatedText() {
  const table = document.getElementById("wordTable");
  const rows = table.rows;
  const entries = [];

  for (let i = 0; i < rows.length; i++) {
    const spanish = rows[i].cells[0]?.textContent.trim() || "";
    const english = rows[i].cells[1]?.textContent.trim() || "";
    if (spanish || english) {
      entries.push(spanish, english);
    }
  }

  const outputText = entries.join(", ");
  // Optionally put it into a textarea for easy copy
  const outputBox = document.getElementById("exportBox");
  if (outputBox) {
    outputBox.value = outputText;
  }
  return outputText;
}