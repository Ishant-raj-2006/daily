import { db } from './firebase.js';

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leaderboard = document.getElementById('leaderboard');

async function loadLeaderboard() {
    leaderboard.innerHTML = '<p style="color: #94a3b8; text-align: center;">Loading Top Grinders...</p>';

    try {
        const q = query(
            collection(db, 'users'),
            orderBy('points', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        leaderboard.innerHTML = '';

        if (snapshot.empty) {
            leaderboard.innerHTML = '<p style="color: #94a3b8; text-align: center;">No users found yet. Be the first!</p>';
            return;
        }

        let rank = 1;

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            let medal = `#${rank}`;
            if (rank === 1) medal = '🥇';
            if (rank === 2) medal = '🥈';
            if (rank === 3) medal = '🥉';

            leaderboard.innerHTML += `
              <div class="leaderboard-item">
                  <div class="rank ${rankClass}">${medal}</div>
                  <div class="lb-details">
                      <div class="lb-name">${data.name || 'Anonymous'}</div>
                      <div style="font-size: 13px; color: #94a3b8;">Streak: ${data.streak || 0} 🔥</div>
                  </div>
                  <div class="lb-points">${data.points || 0} XP</div>
              </div>
            `;

            rank++;
        });
    } catch (err) {
        leaderboard.innerHTML = `<p style="color: #ef4444; text-align: center;">Error loading leaderboard: ${err.message}</p>`;
    }
}

loadLeaderboard();