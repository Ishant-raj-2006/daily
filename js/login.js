import { auth } from './firebase.js';

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginBtn = document.getElementById('loginBtn');

loginBtn.addEventListener('click', async () => {

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {

        await signInWithEmailAndPassword(auth, email, password);

        alert('Login Successful');

        window.location.href = 'dashboard.html';

    } catch (error) {
        alert(error.message);
    }
});