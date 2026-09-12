import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, setDoc, doc, getDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWrHkx7oEENhtjUeb_96l3Z5EORI3hIsI",
  authDomain: "school-lms-afbf1.firebaseapp.com",
  projectId: "school-lms-afbf1",
  storageBucket: "school-lms-afbf1.firebasestorage.app",
  messagingSenderId: "95434265443",
  appId: "1:95434265443:web:2686f46d4902e77066b956"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Tab Switching Function ---
window.switchTab = function(tabName, btnElement) {
  document.querySelectorAll('.tab-content').forEach(view => view.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById('view-' + tabName).classList.remove('hidden');
  btnElement.classList.add('active');
};

// --- Auth Elements ---
const authContainer = document.getElementById("auth-container");
const dashboardContainer = document.getElementById("dashboard-container");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authBtn = document.getElementById("auth-btn");
const authSwitch = document.getElementById("auth-switch");
const authError = document.getElementById("auth-error");
const userEmailSpan = document.getElementById("user-email");
const userClassDisplay = document.getElementById("user-class-display");
const logoutBtn = document.getElementById("logout-btn");
const signupExtraFields = document.getElementById("signup-extra-fields");
const studentClassSelect = document.getElementById("student-class");
const studentMediumSelect = document.getElementById("student-medium");

let isSignUp = false;

authSwitch.onclick = () => {
  isSignUp = !isSignUp;
  document.getElementById("auth-title").innerText = isSignUp ? "Student Registration" : "Student Portal Login";
  authBtn.innerText = isSignUp ? "Register & Start" : "Login";
  authSwitch.innerText = isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up";
  authError.innerText = "";
  
  if (isSignUp) {
    signupExtraFields.classList.remove("hidden");
  } else {
    signupExtraFields.classList.add("hidden");
  }
};

authBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  authError.innerText = "";

  if (!email || !password) {
    authError.innerText = "Please fill in all fields.";
    return;
  }

  try {
    if (isSignUp) {
      const studentClass = studentClassSelect.value;
      const studentMedium = studentMediumSelect.value;

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user profile details in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        studentClass: studentClass,
        medium: studentMedium,
        createdAt: new Date()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    authError.innerText = error.message;
  }
};

logoutBtn.onclick = () => {
  signOut(auth);
};

// Track Logged-in User Profile
let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    userEmailSpan.innerText = user.email;

    // Fetch user extra info (Class & Medium) from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      currentUserData = userDoc.data();
      userClassDisplay.innerText = `${currentUserData.studentClass} (${currentUserData.medium})`;
      document.getElementById("notes-medium-label").innerText = currentUserData.medium;
      updateNotesContent();
    } else {
      userClassDisplay.innerText = "Student";
    }
    loadLeaderboard();
  } else {
    authContainer.classList.remove("hidden");
    dashboardContainer.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";
    currentUserData = null;
  }
});

// --- Score Submission & Leaderboard ---
const testScoreInput = document.getElementById("test-score");
const submitScoreBtn = document.getElementById("submit-score-btn");
const leaderboardList = document.getElementById("leaderboard-list");

submitScoreBtn.onclick = async () => {
  const score = parseInt(testScoreInput.value);
  if (isNaN(score) || score < 0 || score > 100) {
    alert("Please enter a valid score between 0 and 100!");
    return;
  }

  const user = auth.currentUser;
  if (user && currentUserData) {
    try {
      await setDoc(doc(db, "leaderboard", user.uid), {
        email: user.email,
        class: currentUserData.studentClass,
        score: score,
        timestamp: new Date()
      });
      alert("Score submitted successfully!");
      testScoreInput.value = "";
      loadLeaderboard();
    } catch (e) {
      alert("Error submitting score: " + e.message);
    }
  }
};

async function loadLeaderboard() {
  leaderboardList.innerHTML = "<li style='padding:8px 0;'>Loading rankings...</li>";
  try {
    const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(5));
    const querySnapshot = await getDocs(q);
    let html = "";
    let rank = 1;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      html += `<li style="padding: 10px; margin-bottom: 6px; background: #121212; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span>#${rank} ${data.email} <small style="color: #94a3b8;">(${data.class || 'General'})</small></span>
                <strong style="color: #38bdf8;">${data.score} pts</strong>
              </li>`;
      rank++;
    });
    leaderboardList.innerHTML = html || "<li style='padding:8px 0;'>No scores yet.</li>";
  } catch (e) {
    leaderboardList.innerHTML = "<li style='color: #ef4444;'>Failed to load leaderboard.</li>";
  }
}

// --- Dynamic Bilingual Study Notes Logic ---
const notesDatabase = {
  English: {
    Math: "• Quadratic Equations: ax² + bx + c = 0\n• Pythagoras Theorem: a² + b² = c²\n• Coordinate Geometry Basics & Formulas.",
    Science: "• Laws of Motion (Newton's 1st, 2nd, 3rd laws)\n• Chemical Reactions and Equations overview.\n• Cell Structure and Functions.",
    English: "• Active and Passive Voice rules.\n• Direct and Indirect Speech.\n• Summary writing techniques."
  },
  Hindi: {
    Math: "• द्विघात समीकरण (Quadratic Equations): ax² + bx + c = 0\n• पाइथागोरस प्रमेय (Pythagoras Theorem): a² + b² = c²\n• निर्देशांक ज्यामिति के मुख्य सूत्र।",
    Science: "• गति के नियम (Newton's Laws of Motion)\n• रासायनिक अभिक्रियाएँ एवं समीकरण (Chemical Reactions)\n• कोशिका संरचना एवं कार्य (Cell Structure)।",
    English: "• वाच्य परिवर्तन (Active/Passive Voice नियम)\n• प्रत्यक्ष और अप्रत्यक्ष कथन (Direct/Indirect Speech)\n• निबंध लेखन की रूपरेखा।"
  }
};

const notesSubjectSelect = document.getElementById("notes-subject-select");
const notesContentDiv = document.getElementById("notes-content");

function updateNotesContent() {
  if (!currentUserData) return;
  const medium = currentUserData.medium || "English";
  const subject = notesSubjectSelect.value;
  
  const notesText = notesDatabase[medium]?.[subject] || "Notes updating soon for this subject.";
  notesContentDiv.innerText = notesText;
}

notesSubjectSelect.onchange = updateNotesContent;

// --- Subject Quiz Logic ---
const quizData = {
  Math: { q: "What is 15 * 5? / 15 गुणे 5 कितना होता है?", ans: "75" },
  Science: { q: "Which gas is essential for human respiration? / मानव श्वसन के लिए कौन सी गैस आवश्यक है?", ans: "oxygen" },
  English: { q: "What is the antonym of 'Happy'? / 'Happy' का विलोम शब्द क्या है?", ans: "sad" }
};

const subjectSelect = document.getElementById("subject-select");
const quizQuestion = document.getElementById("quiz-question");
const quizAnswer = document.getElementById("quiz-answer");
const submitQuizBtn = document.getElementById("submit-quiz-btn");
const quizFeedback = document.getElementById("quiz-feedback");

function updateQuiz() {
  const subj = subjectSelect.value;
  quizQuestion.innerText = "Q: " + quizData[subj].q;
  quizAnswer.value = "";
  quizFeedback.innerText = "";
}

subjectSelect.onchange = updateQuiz;
updateQuiz();

submitQuizBtn.onclick = () => {
  const subj = subjectSelect.value;
  const userAns = quizAnswer.value.trim().toLowerCase();
  if (!userAns) {
    quizFeedback.innerText = "Please enter an answer!";
    return;
  }

  if (userAns === quizData[subj].ans) {
    quizFeedback.style.color = "#22c55e";
    quizFeedback.innerText = "Correct! शानदार जवाब!";
  } else {
    quizFeedback.style.color = "#ef4444";
    quizFeedback.innerText = "Incorrect. दोबारा प्रयास करें!";
  }
};

// --- Real Google Gemini AI Integration ---
const GEMINI_API_KEY = "AQ.Ab8RN6JTun7CPg6LMJtG7mIlv3KFm7S_8fA4qoSWN2U5QOkXFg";

async function askRealGemini(promptText, studentClass, studentMedium) {
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const systemPrompt = `You are an expert, friendly school AI tutor for K-12 students. The student is studying in ${studentClass} and their preferred medium is ${studentMedium}. Answer their study doubt clearly, accurately, and in an encouraging tone, matching their medium (Hindi or English).`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { text: promptText }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return `API Error: ${data.error.message}`;
    }

    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    return "कनेक्शन एरर: इंटरनेट या API Key की जांच करें।";
  }
}
 

  

const askAiBtn = document.getElementById("ask-ai-btn");
const aiInput = document.getElementById("ai-question-input");
const aiResponseBox = document.getElementById("ai-response-box");

askAiBtn.onclick = async () => {
  const queryText = aiInput.value.trim();
  if (!queryText) {
    aiResponseBox.innerText = "Please type a question first! / कृपया पहले अपना सवाल लिखें।";
    return;
  }

  aiResponseBox.innerText = "Gemini AI सोच रहा है... / Thinking...";

  const studentClass = currentUserData ? currentUserData.studentClass : "Class 10";
  const studentMedium = currentUserData ? currentUserData.medium : "English";

  const aiReply = await askRealGemini(queryText, studentClass, studentMedium);
  aiResponseBox.innerText = aiReply;
};
