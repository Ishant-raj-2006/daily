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
    onSnapshot,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUser = null;
let allHabits = [];
let todayCompletions = {};

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

function getLocalDateStr() {
    const d = new Date();
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
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
        await addDoc(collection(db, 'habits'), {
            userId: currentUser.uid,
            title,
            deleted: false,
            createdAt: new Date().getTime()
        });

        taskInput.value = '';
        addTaskBtn.innerText = 'Add';
        
        window.showToast("Your habit added successfully! ✨", "#10b981");
        
    } catch (err) {
        alert("Error adding habit: " + err.message);
        addTaskBtn.innerText = 'Add';
    }
});

function setupRealtimeTasks() {
    taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">Loading...</p>';
    
    const todayStr = getLocalDateStr();

    // 1. Listen to Habits
    const qHabits = query(
        collection(db, 'habits'),
        where('userId', '==', currentUser.uid)
    );

    onSnapshot(qHabits, (querySnapshot) => {
        allHabits = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.deleted !== true) {
                allHabits.push({ id: docSnap.id, ...data });
            }
        });
        allHabits.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        renderTasks();
    });

    // 2. Listen to Completions for Today
    const qCompletions = query(
        collection(db, 'completions'),
        where('userId', '==', currentUser.uid),
        where('date', '==', todayStr)
    );

    onSnapshot(qCompletions, (querySnapshot) => {
        todayCompletions = {};
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            todayCompletions[data.habitId] = { id: docSnap.id, ...data };
        });
        renderTasks();
    });
}

function renderTasks() {
    taskList.innerHTML = '';
    let hasTasks = false;

    allHabits.forEach((habit) => {
        hasTasks = true;
        const completion = todayCompletions[habit.id];
        const isCompleted = completion && completion.status === 'completed';
        const isFailed = completion && completion.status === 'failed';

        const div = document.createElement('div');
        div.classList.add('card');
        
        let titleStyle = "width: 100%; word-wrap: break-word;";
        let statusText = "";
        let bgStyle = "background: rgba(255, 255, 255, 0.03);";
        let actionArea = "";
        
        if (isCompleted) {
            titleStyle += " text-decoration: line-through; color: #10b981;";
            statusText = `<span style="color:#10b981; font-size:12px; font-weight:bold; margin-bottom:5px; display:block;">COMPLETED TODAY ✅</span>`;
            bgStyle = "background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);";
            
            actionArea = `
                <div style="width: 100%; text-align: right; margin-top: 10px;">
                    <span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; border: 1px solid rgba(16, 185, 129, 0.4); display: inline-block;">
                        +1 Point 🌟
                    </span>
                </div>
            `;
        } else if (isFailed) {
            titleStyle += " text-decoration: line-through; color: #f59e0b;";
            statusText = `<span style="color:#f59e0b; font-size:12px; font-weight:bold; margin-bottom:5px; display:block;">MISSED TODAY ❌</span>`;
            bgStyle = "background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2);";
            
            actionArea = `
                <div style="width: 100%; text-align: right; margin-top: 10px;">
                    <span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; border: 1px solid rgba(245, 158, 11, 0.4); display: inline-block;">
                        0 Points
                    </span>
                </div>
            `;
        } else {
            statusText = `<span style="color:#94a3b8; font-size:12px; font-weight:bold; margin-bottom:5px; display:block;">PENDING ⏳</span>`;
            
            actionArea = `
                <div style="display: flex; gap: 8px; width: 100%; flex-wrap: wrap; margin-top: 10px;">
                    <button onclick="completeTask('${habit.id}')" style="flex: 1; min-width: 80px;">
                      Done ✅
                    </button>
                    <button onclick="failTask('${habit.id}')" style="flex: 1; min-width: 80px; background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4);">
                      Not ❌
                    </button>
                    <button onclick="deleteTask('${habit.id}')" style="flex: 1; min-width: 80px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);">
                      Delete 🗑️
                    </button>
                </div>
            `;
        }

        div.style.cssText = `${bgStyle} padding: 20px; margin-top: 15px; border-radius: 18px; transition: transform 0.3s ease;`;

        div.innerHTML = `
          <div class="task" style="flex-direction: column; align-items: flex-start; gap: 5px;">
            ${statusText}
            <h3 style="${titleStyle}">${habit.title}</h3>
            ${actionArea}
          </div>
        `;
        taskList.appendChild(div);
    });

    if (!hasTasks) {
        taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">No habits found. Add a new habit above! 🎉</p>';
    }
}

window.completeTask = async (habitId) => {
    try {
        const todayStr = getLocalDateStr();
        
        // 1. Add Completion Record
        await addDoc(collection(db, 'completions'), {
            userId: currentUser.uid,
            habitId: habitId,
            date: todayStr,
            status: 'completed',
            completedAt: new Date().getTime()
        });

        // 2. Update Points & Proper Streak Logic
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            let currentStreak = userData.streak || 0;
            let bestStreak = userData.bestStreak || 0;
            let lastCompletedDate = userData.lastCompletedDate || null;
            let points = userData.points || 0;
            
            if (lastCompletedDate !== todayStr) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                if (lastCompletedDate === yesterdayStr) {
                    currentStreak += 1;
                } else {
                    currentStreak = 1; // reset streak if broken
                }
                
                if (currentStreak > bestStreak) bestStreak = currentStreak;
                
                await updateDoc(userRef, {
                    points: points + 1,
                    streak: currentStreak,
                    bestStreak: bestStreak,
                    lastCompletedDate: todayStr
                });
                window.showToast(`Awesome! +1 Point 🌟 Streak: ${currentStreak} 🔥`, "#10b981");
            } else {
                await updateDoc(userRef, {
                    points: points + 1
                });
                window.showToast("Awesome! +1 Point 🌟", "#10b981");
            }
        }
    } catch (err) {
        alert("Error completing task: " + err.message);
    }
};

window.failTask = async (habitId) => {
    try {
        const todayStr = getLocalDateStr();
        await addDoc(collection(db, 'completions'), {
            userId: currentUser.uid,
            habitId: habitId,
            date: todayStr,
            status: 'failed',
            completedAt: new Date().getTime()
        });
        window.showToast("Task Missed! Graph % went down 📉", "#f59e0b");
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.deleteTask = async (habitId) => {
    if(!confirm("Are you sure you want to delete this habit? History will be kept.")) return;
    try {
        // Soft delete to maintain history for completions
        const habitRef = doc(db, 'habits', habitId);
        await updateDoc(habitRef, { deleted: true });
        window.showToast("Habit Deleted 🗑️", "#ef4444");
    } catch (err) {
        alert("Error deleting habit: " + err.message);
    }
};

function setupRealtimeUser() {
    const userRef = doc(db, 'users', currentUser.uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            pointsEl.innerText = data.points || 0;
            
            // If there's a streak element on dashboard, we can update it here too.
            // Example: if (document.getElementById('streak')) document.getElementById('streak').innerText = data.streak || 0;
        }
    });
}