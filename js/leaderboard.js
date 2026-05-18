import { db } from './firebase.js';

import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const leaderboard = document.getElementById('leaderboard');

function getLevelInfo(points) {
    let xp = points || 0;
    let level = Math.floor(xp / 10) + 1; // Example: 1 level per 10 points
    let title = 'Beginner 🌱';
    if (level >= 50) title = 'Legend 👑';
    else if (level >= 20) title = 'Beast 🐺';
    else if (level >= 10) title = 'Grinder ⚔️';
    else if (level >= 5) title = 'Hustler 🚀';
    
    return { level, title };
}

function setupRealtimeLeaderboard() {
    leaderboard.innerHTML = '<p style="color: #94a3b8; text-align: center;">Loading Top Grinders...</p>';

    const q = query(
        collection(db, 'users'),
        orderBy('points', 'desc'),
        limit(50)
    );

    // FAST RESPONSE: Listen for real-time updates!
    onSnapshot(q, (snapshot) => {
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

            const levelInfo = getLevelInfo(data.points);
            const fallbackSeed = data.name ? data.name.replace(/\s+/g, '') : 'GrindXP';
            const photoUrl = data.profilePhoto && data.profilePhoto !== 'assets/default.png' 
                ? data.profilePhoto 
                : `https://api.dicebear.com/8.x/avataaars/svg?seed=${fallbackSeed}`;

            leaderboard.innerHTML += `
              <div class="leaderboard-item" style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 15px;">
                  <div class="rank ${rankClass}" style="min-width: 30px; font-weight: bold; font-size: 1.2rem; text-align: center;">${medal}</div>
                  
                  <img src="${photoUrl}" alt="Avatar" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(168, 85, 247, 0.5);">
                  
                  <div class="lb-details" style="flex: 1;">
                      <div class="lb-name" style="font-weight: 600; font-size: 1.1rem;">${data.name || 'Anonymous'}</div>
                      <div style="font-size: 12px; color: #a855f7; font-weight: bold;">
                        Lv ${levelInfo.level} • ${levelInfo.title}
                      </div>
                  </div>
                  
                  <div style="text-align: right;">
                      <div class="lb-points" style="font-weight: bold; color: #fbbf24; font-size: 1.1rem;">${data.points || 0} XP</div>
                      <div style="font-size: 12px; color: #94a3b8;">Streak: ${data.streak || 0} 🔥</div>
                  </div>
              </div>
            `;

            rank++;
        });
    });
}

setupRealtimeLeaderboard();