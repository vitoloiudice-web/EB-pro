
import { initializeApp } from "firebase/app";

try {
    console.log("Attempting to initialize Firebase with empty config...");
    const firebaseConfig = {
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    };
    const app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully (Unexpectedly).");
} catch (error) {
    console.error("Caught expected error:", error.message);
    console.log("CRASH CONFIRMED: Firebase throws when config is empty.");
}
