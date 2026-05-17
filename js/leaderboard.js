import { db } from './firebase.js';

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leaderboard = document.getElementById('leaderboard');

async function loadLeaderboard() {

    const q = query(
        collection(db, 'users'),
        orderBy('points', 'desc')
    );

    const snapshot = await getDocs(q);

    let rank = 1;

    snapshot.forEach((doc) => {

        const data = doc.data();

        leaderboard.innerHTML += `
      <div class="card">
        <h2>#${rank} ${data.name}</h2>
        <p>XP: ${data.points}</p>
        <p>Streak: ${data.streak}</p>
      </div>
    `;

        rank++;
    });
}

loadLeaderboard();