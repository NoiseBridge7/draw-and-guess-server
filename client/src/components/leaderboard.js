import React from "react";

function Leaderboard({ players, drawerId }){
    return (
        <div>
            <h2>Leaderboard</h2>
            <ul>
                {players.map((p) => (
                <li key={p.id}>
                    {p.username}{p.id === drawerId ? " (Drawer)" : ""}: {p.score}
                </li>
                ))}
            </ul>
        </div>
    );
}

export default Leaderboard