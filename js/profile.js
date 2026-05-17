import { auth, db } from './firebase.js';

import {
    doc,
    updateDoc,
    onSnapshot,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUser = null;
let profileData = null;

// Helper to extract username from email
function getUsername(email) {
    if(!email) return 'user';
    return email.split('@')[0];
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const userRef = doc(db, 'users', user.uid);
        
        onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
                const data = userSnap.data();
                profileData = data;
                
                document.getElementById('name').innerText = data.name || 'Anonymous Grinder';
                document.getElementById('username').innerText = '@' + getUsername(data.email);
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

        // Initialize UI components
        initWeeklyChart();
        initHeatmap();

    } else {
        window.location.href = 'login.html';
    }
});

// Update Profile Photo
document.getElementById('updatePhotoBtn').addEventListener('click', async () => {
    const photoUrl = document.getElementById('photoUrlInput').value.trim();
    if (!photoUrl) {
        window.showToast("Please enter a valid image URL!", "#ef4444");
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
        window.showToast("Profile Photo Updated!", "#10b981");
        
        setTimeout(() => {
            btn.innerText = 'Save';
        }, 2000);
    } catch (err) {
        window.showToast("Error updating photo: " + err.message, "#ef4444");
        document.getElementById('updatePhotoBtn').innerText = 'Save';
    }
});

// Weekly Performance Chart (Chart.js)
function initWeeklyChart() {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    // Using simulated data to represent Mon-Sun
    // In a real app, this would be aggregated from Firestore
    const dummyData = [10, 30, 20, 50, 40, 70, 90]; 

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'XP Earned',
                data: dummyData,
                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                borderColor: '#a855f7',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#cbd5e1' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#cbd5e1' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f8fafc' }
                }
            }
        }
    });
}

// GitHub Style Heatmap
function initHeatmap() {
    const heatmap = document.getElementById('heatmap');
    heatmap.innerHTML = '';
    
    // Simulate 100 days of activity (approx 3 months)
    for (let i = 0; i < 112; i++) {
        const box = document.createElement('div');
        box.classList.add('heat-box');
        
        // Randomly assign activity level 0-4
        const rand = Math.random();
        if(rand > 0.9) box.classList.add('heat-4');
        else if(rand > 0.7) box.classList.add('heat-3');
        else if(rand > 0.5) box.classList.add('heat-2');
        else if(rand > 0.3) box.classList.add('heat-1');
        // else leave empty (heat-box default)

        heatmap.appendChild(box);
    }
}

// Account Security: Change Password
document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const email = document.getElementById('cpEmail').value;
    const currentPass = document.getElementById('cpCurrent').value;
    const newPass = document.getElementById('cpNew').value;
    const confirmPass = document.getElementById('cpConfirm').value;

    if(!email || !currentPass || !newPass || !confirmPass) {
        window.showToast("All fields are required!", "#ef4444");
        return;
    }

    if(newPass !== confirmPass) {
        window.showToast("New passwords do not match!", "#ef4444");
        return;
    }

    if(email !== currentUser.email) {
        window.showToast("Email does not match your account!", "#ef4444");
        return;
    }

    try {
        const btn = document.getElementById('changePasswordBtn');
        btn.innerText = "Updating...";
        btn.disabled = true;

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
        await reauthenticateWithCredential(currentUser, credential);

        // Update Password
        await updatePassword(currentUser, newPass);

        window.showToast("Password updated successfully! 🔒", "#10b981");
        
        // Clear fields
        document.getElementById('cpEmail').value = '';
        document.getElementById('cpCurrent').value = '';
        document.getElementById('cpNew').value = '';
        document.getElementById('cpConfirm').value = '';

        btn.innerText = "Update Password";
        btn.disabled = false;

    } catch (err) {
        window.showToast("Error: " + err.message, "#ef4444");
        const btn = document.getElementById('changePasswordBtn');
        btn.innerText = "Update Password";
        btn.disabled = false;
    }
});

// Account Security: Export Data
document.getElementById('exportDataBtn').addEventListener('click', () => {
    if(!profileData) {
        window.showToast("Data not loaded yet!", "#ef4444");
        return;
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profileData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "grindxp_profile.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    window.showToast("Data Exported! 📥", "#10b981");
});

// Account Security: Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if(confirm("Are you sure you want to logout?")) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (err) {
            window.showToast("Error: " + err.message, "#ef4444");
        }
    }
});

// Account Security: Delete Account
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    const confirmPrompt = prompt("Type 'DELETE' to confirm account deletion. This cannot be undone.");
    if(confirmPrompt === 'DELETE') {
        try {
            // Wait, we need reauthentication theoretically, but let's try direct deletion
            // If it fails, firebase will throw 'auth/requires-recent-login'
            await deleteUser(currentUser);
            window.location.href = 'register.html';
        } catch (err) {
            if(err.code === 'auth/requires-recent-login') {
                window.showToast("Please logout and login again to delete your account.", "#ef4444");
            } else {
                window.showToast("Error: " + err.message, "#ef4444");
            }
        }
    } else {
        window.showToast("Deletion cancelled.", "#f59e0b");
    }
});