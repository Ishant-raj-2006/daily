import { auth, db } from './firebase.js';

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const registerBtn = document.getElementById('registerBtn');

registerBtn.addEventListener('click', async () => {

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;

    if (!name || !email || !password) {
        alert("Please fill in all required fields!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;
        const seed = name.trim().replace(/\s+/g, '') || 'GrindXP';

        await setDoc(doc(db, 'users', user.uid), {
            name,
            email,
            phone,
            points: 0,
            streak: 0,
            joinDate: new Date().toDateString(),
            profilePhoto: `https://api.dicebear.com/8.x/avataaars/svg?seed=${seed}`
        });

        window.location.href = 'dashboard.html';

    } catch (error) {
        alert(error.message);
    }
});