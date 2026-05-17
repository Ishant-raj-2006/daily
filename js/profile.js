import { auth, db } from './firebase.js';

import {
    doc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const userRef = doc(db, 'users', user.uid);
        
        // FAST RESPONSE: Real-time profile updates
        onSnapshot(userRef, (userSnap) => {
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
        });
    } else {
        window.location.href = 'login.html';
    }
});

document.getElementById('updatePhotoBtn').addEventListener('click', async () => {
    const photoUrl = document.getElementById('photoUrlInput').value.trim();
    if (!photoUrl) {
        alert("Please enter a valid image URL!");
        return;
    }

    if (!currentUser) return;
    
    try {
        const btn = document.getElementById('updatePhotoBtn');
        btn.innerText = '...';
        
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            profilePhoto: photoUrl
        });

        document.getElementById('photoUrlInput').value = '';
        btn.innerText = 'Saved ✅';
        
        setTimeout(() => {
            btn.innerText = 'Save';
        }, 2000);
    } catch (err) {
        alert("Error updating photo: " + err.message);
        document.getElementById('updatePhotoBtn').innerText = 'Save';
    }
});