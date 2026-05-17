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

window.showToast = function(message, color = "#10b981") {
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
            failed: false,
            createdAt: new Date().getTime()
        });

        taskInput.value = '';
        addTaskBtn.innerText = 'Add';
        
        window.showToast("Your task added successfully! ✨", "#10b981");
        
    } catch (err) {
        alert("Error adding task: " + err.message);
        addTaskBtn.innerText = 'Add';
    }
});

function setupRealtimeTasks() {
    taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">Loading...</p>';
    
    const q = query(
        collection(db, 'tasks'),
        where('userId', '==', currentUser.uid)
    );

    // FAST RESPONSE: Listen for real-time updates!
    onSnapshot(q, (querySnapshot) => {
        taskList.innerHTML = '';
        let hasTasks = false;

        // Convert to array and sort by createdAt descending (newest first)
        const tasksArray = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deleted !== true) {
                tasksArray.push({ id: docSnap.id, ...data });
            }
        });

        tasksArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        tasksArray.forEach((data) => {
            hasTasks = true;
            const div = document.createElement('div');
            div.classList.add('card');
            
            let titleStyle = "width: 100%; word-wrap: break-word;";
            let statusText = "";
            let bgStyle = "background: rgba(255, 255, 255, 0.03);";
            
            if (data.completed) {
                titleStyle += " text-decoration: line-through; color: #10b981;";
                statusText = `<span style="color:#10b981; font-size:12px; font-weight:bold; margin-bottom:5px; display:block;">COMPLETED ✅</span>`;
                bgStyle = "background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);";
            } else if (data.failed) {
                titleStyle += " text-decoration: line-through; color: #f59e0b;";
                statusText = `<span style="color:#f59e0b; font-size:12px; font-weight:bold; margin-bottom:5px; display:block;">MISSED ❌</span>`;
                bgStyle = "background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2);";
            } else {
                statusText = `<span style="color:#94a3b8; font-size:12px; font-weight:bold; margin-bottom:5px; display:block;">PENDING ⏳</span>`;
            }

            div.style.cssText = `${bgStyle} padding: 20px; margin-top: 15px; border-radius: 18px; transition: transform 0.3s ease;`;

            let buttonsHTML = '';
            if (!data.completed && !data.failed) {
                buttonsHTML = `
                    <button onclick="completeTask('${data.id}')" style="flex: 1; min-width: 80px;">
                      Done ✅
                    </button>
                    <button onclick="failTask('${data.id}')" style="flex: 1; min-width: 80px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);">
                      Not ❌
                    </button>
                `;
            }

            div.innerHTML = `
              <div class="task" style="flex-direction: column; align-items: flex-start; gap: 5px;">
                ${statusText}
                <h3 style="${titleStyle}">${data.title}</h3>
                <div style="display: flex; gap: 8px; width: 100%; flex-wrap: wrap; margin-top: 10px;">
                    ${buttonsHTML}
                    <button onclick="deleteTask('${data.id}')" style="flex: 1; min-width: 80px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
                      Delete 🗑️
                    </button>
                </div>
              </div>
            `;
            taskList.appendChild(div);
        });

        if (!hasTasks) {
            taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">No tasks found. Add a new habit above! 🎉</p>';
        }
    });
}

window.completeTask = async (taskId) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, {
            completed: true,
            completedAt: new Date().getTime()
        });

        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            points: increment(1) 
        });
        window.showToast("Awesome! +1 Point 🌟", "#10b981");
    } catch (err) {
        alert("Error completing task: " + err.message);
    }
};

window.failTask = async (taskId) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, {
            failed: true 
        });
        window.showToast("Task Missed! Graph % went down 📉", "#f59e0b");
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.deleteTask = async (taskId) => {
    if(!confirm("Are you sure you want to delete this task? It will be completely removed.")) return;
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        window.showToast("Task Deleted 🗑️", "#ef4444");
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