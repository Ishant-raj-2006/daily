import { auth, db } from './firebase.js';

await addDoc(collection(db, 'tasks'), {
    userId: currentUser.uid,
    title,
    completed: false
});

taskInput.value = '';

loadTasks();
});

async function loadTasks() {

    taskList.innerHTML = '';

    const q = query(
        collection(db, 'tasks'),
        where('userId', '==', currentUser.uid)
    );

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {

        const data = docSnap.data();

        const div = document.createElement('div');

        div.classList.add('card');

        div.innerHTML = `
      <div class="task">
        <h3>${data.title}</h3>
        <button onclick="completeTask('${docSnap.id}')">
          Done
        </button>
      </div>
    `;

        taskList.appendChild(div);
    });
}

window.completeTask = async (taskId) => {

    const taskRef = doc(db, 'tasks', taskId);

    await updateDoc(taskRef, {
        completed: true
    });

    const userRef = doc(db, 'users', currentUser.uid);

    await updateDoc(userRef, {
        points: increment(1)
    });

    loadTasks();
    loadUser();
};