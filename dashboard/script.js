const SERVER_URL = 'http://localhost:3000';
const socket = io(SERVER_URL);

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

// Real-time log updates
socket.on("newLog", (log) => {
  console.log('Real-time log received:', log);
  appendLog(log);
});

socket.on('connect', () => {
  console.log('Connected to server for real-time updates');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

function appendLog(log) {
  const tbody = document.getElementById('logsTable');
  
  const logName = log.name || 'Unknown';
  const logType = log.type || 'unknown';
  const logUid = log.uid || 'N/A';
  const logTimestamp = log.timestamp || new Date();
  const logDate = log.date || new Date(logTimestamp).toLocaleDateString('en-US');
  
  const formattedTime = new Date(logTimestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
  
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${logName}</td>
    <td>${logUid}</td>
    <td>${logType.toUpperCase()}</td>
    <td>${formattedTime}</td>
    <td>${logDate}</td>
  `;
  tbody.prepend(row);
}

// Registration form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const uid = form.uid.value.trim().toUpperCase();
  const gender = form.gender.value;
  const email = form.email.value.trim();
  const phoneNumber = form.phoneNumber.value.trim();

  // Validation
  if (!name) {
    alert('Name is required.');
    return;
  }

  if (uid.length !== 7 || !/^[A-F0-9]{7}$/.test(uid)) {
    alert(`UID must be exactly 7 hexadecimal characters (0-9, A-F). You entered: "${uid}"`);
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert(`Invalid email format. You entered: "${email}"`);
    return;
  }

  if (!/^09\d{9}$/.test(phoneNumber)) {
    alert(`Phone number must start with 09 and be 11 digits. You entered: "${phoneNumber}"`);
    return;
  }

  const user = { name, uid, gender, email, phoneNumber };

  try {
    const res = await fetch(`${SERVER_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    
    if (res.ok) {
      alert('User registered successfully!');
      form.reset();
      loadUsers();
    } else {
      if (data.message && data.message.includes('already exists')) {
        alert(`Registration failed: ${data.message}`);
      } else {
        alert(`Registration failed: ${data.message || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Error during registration:', error);
    alert(`Network error: ${error.message}`);
  }
});

// Load users
async function loadUsers() {
  try {
    const res = await fetch(`${SERVER_URL}/api/users`);
    const users = await res.json();
    const tbody = document.getElementById('userTable');
    tbody.innerHTML = '';
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.uid}</td>
        <td>${user.gender}</td>
        <td>${user.email}</td>
        <td>${user.phoneNumber}</td>
        <td>
          <button class="save-btn" onclick="editUser('${user._id}')">Edit</button>
          <button class="delete-btn" onclick="deleteUser('${user._id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Delete user
async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    const res = await fetch(`${SERVER_URL}/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      alert('User deleted successfully');
      loadUsers();
    } else {
      alert(data.message || 'Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Error occurred while deleting user.');
  }
}

function editUser(id) {
  window.location.href = `/dashboard/edit.html?id=${id}`;
}

// Search functionality
document.getElementById('searchRegistered').addEventListener('input', function () {
  const filter = this.value.toLowerCase();
  const rows = document.querySelectorAll('#userTable tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filter) ? '' : 'none';
  });
});

// Load logs
async function loadLogs() {
  try {
    const res = await fetch(`${SERVER_URL}/api/logs`);
    const logs = await res.json();
    const tbody = document.getElementById('logsTable');
    tbody.innerHTML = '';
    logs.forEach(log => appendLog(log));
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}

document.getElementById('searchLog').addEventListener('input', function () {
  const filter = this.value.toLowerCase();
  const rows = document.querySelectorAll('#logsTable tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filter) ? '' : 'none';
  });
});

// Initialize
loadUsers();
loadLogs();