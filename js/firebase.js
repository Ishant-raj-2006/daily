import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBQhGn6FZPRFQ4rhdYy7iaYC5kO9xWzpds",
    authDomain: "daily-routing.firebaseapp.com",
    projectId: "daily-routing",
    storageBucket: "daily-routing.firebasestorage.app",
    messagingSenderId: "329281719653",
    appId: "1:329281719653:web:907855b4262bc9f35c658c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);