// Firebase web app configuration shared by the mobile and web clients.

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCxS70aYDwU-2JJe4dCyNWQfWEA-DbMdss",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "fixquickproject.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "fixquickproject",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "fixquickproject.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "559998958147",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:559998958147:web:a40fd536fb212dba0672f6",
  measurementId: "G-SQ20HG18DW",
};

export default firebaseConfig;
