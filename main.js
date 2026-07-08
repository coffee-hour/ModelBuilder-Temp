/**
 * MUD Logic & GAS Integration
 */

// REPLACE THIS with your deployed Google Apps Script Web App URL
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyb6ICpsENWN3w1p2M3xb7n9mJfHWStPAxUGCPUzJ6JFI2HYOGJDPpYCF0sHwvYZCQt8g/exec';

let player = {
    id: null,
    resolve: 0,
    reputation: 0,
    inventory: []
};

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
    if (GAS_ENDPOINT.includes('YOUR_GOOGLE')) {
        log('Error: GAS_ENDPOINT not configured in main.js', 'error');
        return null;
    }
    
    try {
        const response = await fetch(GAS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({
                action,
                playerId: player.id,
                ...payload
            })
        });
        return await response.json();
    } catch (e) {
        log('Connection error: ' + e.message, 'error');
        return null;
    }
}

async function login(id) {
    player.id = id;
    log(`Connecting as ${id}...`, 'system');
    const data = await api('get_player');
    if (data) {
        player.resolve = data.resolve;
        player.reputation = data.reputation;
        player.inventory = data.inventory;
        updateUI();
        log('\n--- SESSION START ---');
        log('You stand at the edge of the Sunless City. Resolve is your lifeblood.');
        log('Commands: "explore", "rest", "inv", "clear"');
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
    document.getElementById('stat-id').innerText = player.id;
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
        if (roll > 0.7) {
            const item = 'Ancient Scrap';
            player.inventory.push(item);
            player.reputation += 1;
            log(`You found an ${item}! Your reputation grows.`, 'item');
        } else if (roll > 0.4) {
            log('You wandered the dark alleys but found nothing but shadows.');
        } else {
            log('A street urchin tricks you. You lose focus.');
            player.resolve -= 5;
        }
        updateUI();
        await save();
    },
    'rest': async () => {
        log('You find a quiet corner and meditate.');
        player.resolve = Math.min(100, player.resolve + 20);
        updateUI();
        await save();
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
        const val = input.value.trim().toLowerCase();
        input.value = '';
        
        if (!player.id) {
            if (val) await login(val);
            return;
        }

        if (commands[val]) {
            await commands[val]();
        } else {
            log(`Unknown command: ${val}`, 'system');
        }
    }
});