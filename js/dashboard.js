import { auth, db } from './firebase.js';

import {
    collection,
    addDoc,
    query,
    where,
    doc,
    updateDoc,
    increment,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUser = null;

const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const pointsEl = document.getElementById('points');

// Custom Toast Function for nice alerts
function showToast(message, color = "#10b981") {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = color;
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.4s ease';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        setupRealtimeTasks();
        setupRealtimeUser();
    } else {
        window.location.href = 'login.html';
    }
});

addTaskBtn.addEventListener('click', async () => {
    const title = taskInput.value.trim();
    if (!title) return;

    try {
        addTaskBtn.innerText = '...';
        await addDoc(collection(db, 'tasks'), {
            userId: currentUser.uid,
            title,
            completed: false,
            createdAt: new Date().getTime()
        });

        taskInput.value = '';
        addTaskBtn.innerText = 'Add';
        
        showToast("Your task added successfully! ✨", "#10b981");
        
    } catch (err) {
        alert("Error adding task: " + err.message);
        addTaskBtn.innerText = 'Add';
    }
});

function setupRealtimeTasks() {
    taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">Loading...</p>';
    
    const q = query(
        collection(db, 'tasks'),
        where('userId', '==', currentUser.uid),
        where('completed', '==', false)
    );

    // FAST RESPONSE: Listen for real-time updates!
    onSnapshot(q, (querySnapshot) => {
        taskList.innerHTML = '';

        if (querySnapshot.empty) {
            taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">No pending tasks. You are all caught up! 🎉</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.classList.add('card');
            div.style.marginTop = '15px';
            div.innerHTML = `
              <div class="task" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                <h3 style="width: 100%; word-wrap: break-word;">${data.title}</h3>
                <div style="display: flex; gap: 8px; width: 100%; flex-wrap: wrap;">
                    
                    <button onclick="completeTask('${docSnap.id}')" style="flex: 1; min-width: 80px;">
                      Done ✅
                    </button>
                    
                    <button onclick="failTask('${docSnap.id}')" style="flex: 1; min-width: 80px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);">
                      Not ❌
                    </button>

                    <button onclick="deleteTask('${docSnap.id}')" style="flex: 1; min-width: 80px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
                      Delete 🗑️
                    </button>
                </div>
              </div>
            `;
            taskList.appendChild(div);
        });
    });
}

window.completeTask = async (taskId) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, {
            completed: true
        });

        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            points: increment(10) // 10 XP per task!
        });
        showToast("Awesome! +10 XP 🌟", "#10b981");
    } catch (err) {
        alert("Error completing task: " + err.message);
    }
};

window.failTask = async (taskId) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await deleteDoc(taskRef);

        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            points: increment(-5) // Penalty for "Not" done
        });
        showToast("Task Missed! -5 XP 📉", "#f59e0b");
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.deleteTask = async (taskId) => {
    if(!confirm("Are you sure you want to delete this task?")) return;
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        showToast("Task Deleted 🗑️", "#ef4444");
    } catch (err) {
        alert("Error deleting task: " + err.message);
    }
};

function setupRealtimeUser() {
    const userRef = doc(db, 'users', currentUser.uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            pointsEl.innerText = data.points || 0;
        }
    });
}