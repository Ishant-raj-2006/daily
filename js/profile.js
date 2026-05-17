import { auth, db } from './firebase.js';

import {
    collection,
    query,
    where,
    doc,
    updateDoc,
    onSnapshot
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
let chartInstance = null;

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
                
                // Add Current Date as requested
                const today = new Date().toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
                document.getElementById('currentDate').innerText = today;
                
                document.getElementById('points').innerText = data.points || 0;
                
                const profilePhoto = document.getElementById('profilePhoto');
                const fallbackSeed = data.name ? data.name.replace(/\s+/g, '') : 'GrindXP';
                profilePhoto.src = data.profilePhoto && data.profilePhoto !== 'assets/default.png' 
                    ? data.profilePhoto 
                    : `https://api.dicebear.com/8.x/avataaars/svg?seed=${fallbackSeed}`;
            }
        });

        // Setup real-time charts based on REAL tasks data!
        setupRealtimeGraph();
        setupRealtimeHeatmap();

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
        await updateDoc(userRef, { profilePhoto: photoUrl });
        document.getElementById('photoUrlInput').value = '';
        btn.innerText = 'Saved ✅';
        window.showToast("Profile Photo Updated!", "#10b981");
        setTimeout(() => { btn.innerText = 'Save'; }, 2000);
    } catch (err) {
        window.showToast("Error updating photo: " + err.message, "#ef4444");
    }
});

// REAL-TIME Weekly Performance Chart (Percentage % Completed)
function setupRealtimeGraph() {
    const q = query(
        collection(db, 'tasks'),
        where('userId', '==', currentUser.uid)
    );

    onSnapshot(q, (snapshot) => {
        const totalTasks = [0, 0, 0, 0, 0, 0, 0];
        const completedTasks = [0, 0, 0, 0, 0, 0, 0];

        const now = new Date();
        const dayOfWeek = now.getDay() - 1; // 0 for Mon
        const daysSinceMonday = dayOfWeek === -1 ? 6 : dayOfWeek;
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysSinceMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        snapshot.forEach(docSnap => {
            const task = docSnap.data();
            
            // Only count if within current week and not explicitly deleted
            if (task.createdAt && task.createdAt >= startOfWeek.getTime() && task.deleted !== true) {
                const date = new Date(task.createdAt);
                let day = date.getDay() - 1;
                if (day === -1) day = 6;
                
                totalTasks[day]++;
                if (task.completed === true) {
                    completedTasks[day]++;
                }
            }
        });

        // Calculate percentage for each day
        const percentageData = totalTasks.map((total, index) => {
            if (total === 0) return 0;
            return Math.round((completedTasks[index] / total) * 100);
        });

        initWeeklyChart(percentageData);
    });
}

function initWeeklyChart(dataArray) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Task Completion (%)',
                data: dataArray,
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
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: '#cbd5e1',
                        callback: function(value) { return value + "%"; }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#cbd5e1' }
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } },
                tooltip: {
                    callbacks: {
                        label: function(context) { return context.parsed.y + '% Completed'; }
                    }
                }
            }
        }
    });
}

// REAL-TIME GitHub Style Heatmap
function setupRealtimeHeatmap() {
    const q = query(
        collection(db, 'tasks'),
        where('userId', '==', currentUser.uid)
    );

    onSnapshot(q, (snapshot) => {
        const activityMap = {}; 
        
        snapshot.forEach(docSnap => {
            const task = docSnap.data();
            if (task.completed && task.completedAt) {
                const d = new Date(task.completedAt);
                // Adjust for timezone offset to get local YYYY-MM-DD
                const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
        });

        const heatmap = document.getElementById('heatmap');
        heatmap.innerHTML = '';
        
        for (let i = 111; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            const count = activityMap[dateStr] || 0;
            
            const box = document.createElement('div');
            box.classList.add('heat-box');
            box.title = `${dateStr}: ${count} tasks completed`;
            
            if(count >= 4) box.classList.add('heat-4');
            else if(count === 3) box.classList.add('heat-3');
            else if(count === 2) box.classList.add('heat-2');
            else if(count === 1) box.classList.add('heat-1');

            heatmap.appendChild(box);
        }
    });
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

        const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPass);

        window.showToast("Password updated successfully! 🔒", "#10b981");
        
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
    if(!profileData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profileData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "grindxp_profile.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.showToast("Data Exported! 📥", "#10b981");
});

// Account Security: Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if(confirm("Are you sure you want to logout?")) {
        await signOut(auth);
        window.location.href = 'login.html';
    }
});

// Account Security: Delete Account
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    const confirmPrompt = prompt("Type 'DELETE' to confirm account deletion.");
    if(confirmPrompt === 'DELETE') {
        try {
            await deleteUser(currentUser);
            window.location.href = 'register.html';
        } catch (err) {
            if(err.code === 'auth/requires-recent-login') {
                window.showToast("Please logout and login again to delete your account.", "#ef4444");
            } else {
                window.showToast("Error: " + err.message, "#ef4444");
            }
        }
    }
});