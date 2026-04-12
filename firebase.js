// ============================================
// firebase.js  –  Firebase setup
// ============================================
// 🔴 PASTE YOUR FIREBASE CONFIG OBJECT BELOW
// (Replace EVERYTHING inside the curly braces
//  with YOUR values from the Firebase console)
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAGG3MMGHhLPbhIyd4mKwVl9uHKDOGUZUY",
  authDomain: "win-challange-ad0dd.firebaseapp.com",
  projectId: "win-challange-ad0dd",
  storageBucket: "win-challange-ad0dd.firebasestorage.app",
  messagingSenderId: "704336625668",
  appId: "1:704336625668:web:b3137867e6b21ebb69f551",
  measurementId: "G-54X5MRLJ5G"
};

// Initialize Firebase using the CDN-loaded global
firebase.initializeApp(firebaseConfig);

// Get a reference to Firestore database
const db = firebase.firestore();
