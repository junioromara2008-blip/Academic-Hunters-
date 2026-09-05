/**
 * UI Updates for Firebase Integration
 * Replaces IndexedDB with API calls
 */

/**
 * Initialize app with new authentication flow
 */
function initializeApp() {
  const token = localStorage.getItem('ah_token');
  const user = localStorage.getItem('ah_user');

  if (token && user) {
    document.getElementById('loginScreen').style.display = 'none';
    showUser();
    loadNotesFromServer();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
  }
}

/**
 * New OTP flow with real backend
 */
async function sendOTP() {
  const phone = document.getElementById('phone').value.trim();
  const name = document.getElementById('name').value.trim() || 'Hunter';

  if (phone.length < 10) {
    return alert('Enter valid Uganda number (10+ digits)');
  }

  try {
    const response = await apiClient.sendOTP(phone, name);

    if (response.success) {
      window.tempUser = { phone: response.phoneNumber, name, sessionId: response.sessionId };
      document.getElementById('otpPhone').innerText = phone;
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Verify OTP with backend
 */
async function verifyOTP() {
  const otp = document.getElementById('otp').value.trim();

  if (!otp) {
    return alert('Enter OTP');
  }

  try {
    const response = await apiClient.verifyOTP(
      window.tempUser.phone,
      otp,
      window.tempUser.sessionId
    );

    if (response.success) {
      // Store user and token
      const user = {
        id: response.user.userId,
        phone: response.user.phone,
        fullName: response.user.fullName,
      };

      localStorage.setItem('ah_user', JSON.stringify(user));
      localStorage.setItem('ah_token', response.token);

      myUser = user;

      document.getElementById('loginScreen').style.display = 'none';
      showUser();
      loadNotesFromServer();
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

/**
 * Load notes from Firebase backend
 */
async function loadNotesFromServer() {
  try {
    const response = await apiClient.getNotes();

    if (response.success) {
      window.allNotes = response.notes || [];
      window.allNotes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      renderNotesFixed();
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
    // Fallback to empty array
    window.allNotes = [];
    renderNotesFixed();
  }
}

/**
 * Upload note to backend with file
 */
async function uploadNote(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    return alert('File too large! Max 15MB');
  }

  const title = document.getElementById('noteTitle').value.trim() || file.name;
  const content = document.getElementById('noteContent').value.trim();
  const subject = document.getElementById('noteClass').value.trim();
  const className = '';

  // Convert file to base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const fileData = {
        base64: e.target.result.split(',')[1], // Remove data:image/... prefix
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };

      const response = await apiClient.createNote(title, content, subject, className, fileData);

      if (response.success) {
        alert('Note uploaded successfully!');
        window.allNotes.unshift(response.note);
        renderNotesFixed();

        // Clear form
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('noteClass').value = '';
        input.value = '';
      }
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    }
  };

  reader.readAsDataURL(file);
}

/**
 * Delete note from server
 */
async function deleteNoteFixed(i) {
  if (!confirm('Delete this note?')) return;

  const note = (window.allNotes || [])[i];
  if (!note) return;

  try {
    await apiClient.deleteNote(note.id);
    window.allNotes = window.allNotes.filter((_, idx) => idx !== i);
    renderNotesFixed();
    alert('Note deleted');
  } catch (error) {
    alert(`Delete failed: ${error.message}`);
  }
}

/**
 * Like note via API
 */
async function likeNote(noteId) {
  try {
    const response = await apiClient.likeNote(noteId);
    if (response.success) {
      const note = window.allNotes.find((n) => n.id === noteId);
      if (note) {
        note.likes = response.likeCount;
      }
      renderNotesFixed();
      showFireball();
    }
  } catch (error) {
    console.error('Like failed:', error);
  }
}

/**
 * Bookmark note via API
 */
async function bookmarkNote(noteId) {
  try {
    const bookmarked = window.bookmarks?.includes(noteId);

    if (bookmarked) {
      await apiClient.removeBookmark(noteId);
      window.bookmarks = window.bookmarks.filter((id) => id !== noteId);
    } else {
      await apiClient.bookmarkNote(noteId);
      window.bookmarks = window.bookmarks || [];
      window.bookmarks.push(noteId);
    }

    renderNotesFixed();
  } catch (error) {
    console.error('Bookmark failed:', error);
  }
}

/**
 * Updated send message with auth token
 */
async function send() {
  const inp = document.getElementById('inp');
  const txt = inp.value.trim();

  if (!txt) return;

  inp.value = '';
  const ch = document.getElementById('chat');

  if (curMode === 'ai') {
    ch.innerHTML += `<div class="m mm">${escapeHTML(txt)}</div>`;
    chats[cur.id] = chats[cur.id] || [];
    chats[cur.id].push({ f: 'me', t: txt });
    ch.scrollTop = ch.scrollHeight;

    document.getElementById('think').style.display = 'block';

    try {
      const history = chats[cur.id]
        .slice(-10)
        .map((m) => ({
          role: m.f === 'me' ? 'user' : 'assistant',
          content: m.t,
        }));

      const response = await apiClient.sendMessage(txt, history, cur.n, cur.s);

      if (response) {
        const answer = response.text || 'Sorry, I could not generate an answer.';

        document.getElementById('think').style.display = 'none';

        ch.innerHTML += `
          <div class="m mai">
            <b>${escapeHTML(cur.n)}:</b> ${escapeHTML(answer)}
          </div>`;

        chats[cur.id].push({ f: 'ai', t: answer });
        ch.scrollTop = ch.scrollHeight;
      }
    } catch (error) {
      document.getElementById('think').style.display = 'none';

      ch.innerHTML += `
        <div class="m mai">
          <b>Academic Hunters AI:</b>
          ${error.message}
        </div>`;

      console.error(error);
    }
  }
}

/**
 * Initiate payment for note download
 */
async function initiatePayment(noteId, price) {
  const phoneNumber = prompt('Enter your phone number for payment:', myUser?.phone || '');
  if (!phoneNumber) return;

  try {
    const response = await apiClient.initiatePayment(noteId, price, phoneNumber);

    if (response.success) {
      alert(`Payment initiated!\nReference: ${response.referenceId}\nPlease complete payment in your phone.`);

      // Poll for payment status
      const checkStatus = setInterval(async () => {
        try {
          const status = await apiClient.checkPaymentStatus(response.referenceId);

          if (status.status === 'completed') {
            clearInterval(checkStatus);
            alert('Payment successful! Note unlocked for download.');
          } else if (status.status === 'failed' || status.status === 'expired') {
            clearInterval(checkStatus);
            alert(`Payment ${status.status}. Please try again.`);
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 3000); // Check every 3 seconds

      // Stop checking after 10 minutes
      setTimeout(() => clearInterval(checkStatus), 600000);
    }
  } catch (error) {
    alert(`Payment error: ${error.message}`);
  }
}

// Call on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
