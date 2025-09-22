// For local development
// const SERVER_URL = 'http://localhost:3000';

// For production
const SERVER_URL = "https://jeepez-attendance.onrender.com";

// Get user ID from URL params
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("id");

if (!userId) {
  alert("No user ID provided");
  window.location.href = "/";
}

/**
 * Load user data and populate the form
 */
async function loadUser() {
  try {
    console.log(`[EDIT] Loading user: ${userId}`);
    const res = await fetch(`${SERVER_URL}/api/users/${userId}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch user (status: ${res.status})`);
    }

    const user = await res.json();

    document.getElementById("name").value = user.name || "";
    document.getElementById("uid").value = user.uid || "";
    document.getElementById("gender").value = user.gender || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("phoneNumber").value = user.phoneNumber || "";
  } catch (error) {
    console.error("[EDIT] Error loading user:", error);
    alert("Error loading user data");
    window.location.href = "/";
  }
}

/**
 * Handle form submission for updating user
 */
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const name = form.name.value.trim();
  const uid = form.uid.value.trim().toUpperCase();
  const gender = form.gender.value;
  const email = form.email.value.trim();
  const phoneNumber = form.phoneNumber.value.trim();

  // ✅ Client-side validation
  if (!name) {
    alert("Name is required");
    return;
  }

  if (!/^[0-9A-F]{6,20}$/.test(uid)) {
    alert("UID must be a valid hexadecimal string (6–20 characters)");
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Invalid email format");
    return;
  }

  if (phoneNumber && !/^\+63\d{10}$/.test(phoneNumber)) {
    alert(
      "Phone number must start with +63 and be 13 characters long (e.g., +639123456789)"
    );
    return;
  }

  const userData = { name, uid, gender, email, phoneNumber };

  try {
    console.log("[EDIT] Updating user with data:", userData);
    const res = await fetch(`${SERVER_URL}/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (res.ok) {
      alert("User updated successfully!");
      window.location.href = "/";
    } else {
      console.warn("[EDIT] Update failed:", data);
      alert(`Update failed: ${data.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error("[EDIT] Network error:", error);
    alert("Network error occurred while updating user");
  }
});

// Load user on page start
loadUser();
