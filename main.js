/**
 * MUD Logic & GAS Integration (Multiplayer Edition)
 */

const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyb6ICpsENWN3w1p2M3xb7n9mJfHWStPAxUGCPUzJ6JFI2HYOGJDPpYCF0sHwvYZCQt8g/exec';

let player = {
    username: null,
    resolve: 0,
    reputation: 0,
    inventory: []
};

let lastEventTimestamp = 0;
const terminal = document.getElementById('terminal');
const input = document.getElementById('cmd');

function log(text, className = '') {
    const div = document.createElement('div');
    div.className = className;
    div.innerText = text;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

async function api(action, payload = {}) {
    if (!GAS_ENDPOINT || GAS_ENDPOINT.includes('YOUR_GOOGLE')) {
        log('Error: GAS_ENDPOINT not configured in main.js', 'error');
        return null;
    }
    
    try {
        const response = await fetch(GAS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({
                action,
                username: player.username,
                ...payload
            })
        });
        return await response.json();
    } catch (e) {
        // Silent fail for polling to avoid spamming the terminal on intermittent connection drops
        if (action !== 'poll') log('Connection error: ' + e.message, 'error');
        return null;
    }
}

async function pollEvents() {
    if (!player.username) return;
    
    const data = await api('poll', { lastTimestamp: lastEventTimestamp });
    if (data && data.events) {
        data.events.forEach(event => {
            // Avoid logging our own actions that we've already logged locally
            if (event.username !== player.username || event.type === 'chat') {
                const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (event.type === 'chat') {
                    log(`[${time}] ${event.username}: ${event.text}`, 'chat-msg');
                } else {
                    log(`[${time}] ${event.text}`, 'system');
                }
            }
            lastEventTimestamp = Math.max(lastEventTimestamp, event.timestamp);
        });
    }
}

async function login(username) {
    player.username = username;
    log(`Logging in as "${username}"...`, 'system');
    
    const data = await api('get_player');
    if (data) {
        player.resolve = data.resolve;
        player.reputation = data.reputation;
        player.inventory = data.inventory;
        lastEventTimestamp = Date.now(); // Start polling from now
        updateUI();
        log('\n--- MULTIPLAYER SESSION START ---');
        log(`Welcome back, ${username}. The simulation is live.`);
        log('Commands: "explore", "rest", "inv", "/say <msg>", "clear"');
        
        // Announce join
        await api('log_event', { text: `${username} joined the simulation.`, type: 'join' });
        
        // Start Polling
        setInterval(pollEvents, 4000);
    }
}

async function save() {
    await api('save_player', {
        stats: {
            resolve: player.resolve,
            reputation: player.reputation,
            inventory: player.inventory
        }
    });
}

function updateUI() {
    document.getElementById('stat-id').innerText = player.username;
    document.getElementById('stat-resolve').innerText = player.resolve;
    document.getElementById('stat-reputation').innerText = player.reputation;
}

const commands = {
    'explore': async () => {
        if (player.resolve < 10) {
            log('You are too exhausted to explore.', 'error');
            return;
        }
        player.resolve -= 10;
        const roll = Math.random();
        let actionText = "";
        
        if (roll > 0.7) {
            const item = 'Ancient Scrap';
            player.inventory.push(item);
            player.reputation += 1;
            actionText = `${player.username} found an ${item} in the debris!`;
            log(`You found an ${item}! Your reputation grows.`, 'item');
        } else if (roll > 0.4) {
            actionText = `${player.username} wandered the dark alleys but found nothing.`;
            log('You wandered the dark alleys but found nothing but shadows.');
        } else {
            actionText = `${player.username} was tricked by a street urchin.`;
            log('A street urchin tricks you. You lose focus.');
            player.resolve -= 5;
        }
        
        updateUI();
        await save();
        await api('log_event', { text: actionText, type: 'action' });
    },
    'rest': async () => {
        log('You find a quiet corner and meditate.');
        player.resolve = Math.min(100, player.resolve + 20);
        updateUI();
        await save();
        await api('log_event', { text: `${player.username} is resting.`, type: 'action' });
    },
    'inv': () => {
        log('Inventory: ' + (player.inventory.join(', ') || 'Empty'));
    },
    'clear': () => {
        terminal.innerHTML = '';
    }
};

input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const val = input.value.trim();
        input.value = '';
        
        if (!player.username) {
            if (val) await login(val);
            return;
        }

        if (val.startsWith('/say ')) {
            const msg = val.substring(5);
            log(`You: ${msg}`, 'chat-msg');
            await api('log_event', { text: msg, type: 'chat' });
            return;
        }

        const cmd = val.toLowerCase();
        if (commands[cmd]) {
            await commands[cmd]();
        } else {
            log(`Unknown command: ${cmd}`, 'system');
        }
    }
});