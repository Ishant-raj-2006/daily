import { auth, db } from './firebase.js';

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const data = userSnap.data();
                
                document.getElementById('name').innerText = data.name || 'Anonymous Grinder';
                document.getElementById('email').innerText = data.email || 'No Email';
                document.getElementById('phone').innerText = data.phone || 'N/A';
                document.getElementById('joinDate').innerText = data.joinDate || 'N/A';
                document.getElementById('points').innerText = data.points || 0;
                
                const profilePhoto = document.getElementById('profilePhoto');
                const fallbackSeed = data.name ? data.name.replace(/\s+/g, '') : 'GrindXP';
                profilePhoto.src = data.profilePhoto && data.profilePhoto !== 'assets/default.png' 
                    ? data.profilePhoto 
                    : `https://api.dicebear.com/8.x/avataaars/svg?seed=${fallbackSeed}`;
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        window.location.href = 'login.html';
    }
});