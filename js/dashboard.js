import { auth, db } from './firebase.js';

import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    increment,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let currentUser = null;

const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const pointsEl = document.getElementById('points');

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadTasks();
        loadUser();
    } else {
        window.location.href = 'login.html';
    }
});

addTaskBtn.addEventListener('click', async () => {
    const title = taskInput.value.trim();
    if (!title) return;

    try {
        await addDoc(collection(db, 'tasks'), {
            userId: currentUser.uid,
            title,
            completed: false
        });

        taskInput.value = '';
        loadTasks();
    } catch (err) {
        alert("Error adding task: " + err.message);
    }
});

async function loadTasks() {
    taskList.innerHTML = '<p style="color: #94a3b8; text-align: left;">Loading...</p>';
    
    const q = query(
        collection(db, 'tasks'),
        where('userId', '==', currentUser.uid),
        where('completed', '==', false)
    );

    const querySnapshot = await getDocs(q);
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
          <div class="task">
            <h3>${data.title}</h3>
            <button onclick="completeTask('${docSnap.id}')">
              Done ✅
            </button>
          </div>
        `;
        taskList.appendChild(div);
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

        loadTasks();
        loadUser();
    } catch (err) {
        alert("Error completing task: " + err.message);
    }
};

async function loadUser() {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        pointsEl.innerText = data.points || 0;
    }
}