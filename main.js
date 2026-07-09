const postsData = [
    {
        id: 1,
        username: "omni_man",
        avatarText: "OM",
        imageUrl: "https://via.placeholder.com/600/b71c1c/ffffff?text=Look+At+My+Power",
        likes: 1250,
        caption: "Thinking about the future. It's inevitable."
    },
    {
        id: 2,
        username: "cypher_dev",
        avatarText: "CD",
        imageUrl: "https://via.placeholder.com/600/1e88e5/ffffff?text=Code+Simulation",
        likes: 840,
        caption: "The matrix isn't built in a day. v5.5.8 is live."
    },
    {
        id: 3,
        username: "mark_inv",
        avatarText: "MI",
        imageUrl: "https://via.placeholder.com/600/ffeb3b/000000?text=Flying+High",
        likes: 2100,
        caption: "Training hard. Getting faster every day. #flight"
    },
    {
        id: 4,
        username: "sequid_zone",
        avatarText: "SZ",
        imageUrl: "https://via.placeholder.com/600/ff00ff/ffffff?text=Pink+Vibes",
        likes: 45,
        caption: "Just hanging out in the zone."
    }
];

const feedContainer = document.getElementById('feed');

function createPostElement(post) {
    const postDiv = document.createElement('article');
    postDiv.className = 'post';
    
    postDiv.innerHTML = `
        <div class="post-header">
            <div class="avatar">${post.avatarText}</div>
            <span class="username">${post.username}</span>
        </div>
        <div class="post-image-container">
            <img class="post-image" src="${post.imageUrl}" alt="Post by ${post.username}">
        </div>
        <div class="post-actions">
            <span class="action-btn like-btn">🤍</span>
            <span class="action-btn">💬</span>
            <span class="action-btn">✈️</span>
        </div>
        <div class="post-info">
            <span class="likes-count">${post.likes} likes</span>
            <div class="caption">
                <span class="username">${post.username}</span>
                ${post.caption}
            </div>
        </div>
    `;

    // Add simple interaction
    const likeBtn = postDiv.querySelector('.like-btn');
    let liked = false;
    likeBtn.onclick = () => {
        liked = !liked;
        likeBtn.textContent = liked ? '❤️' : '🤍';
        const likesCount = postDiv.querySelector('.likes-count');
        likesCount.textContent = `${liked ? post.likes + 1 : post.likes} likes`;
    };

    return postDiv;
}

function renderFeed() {
    postsData.forEach(post => {
        feedContainer.appendChild(createPostElement(post));
    });
}

document.addEventListener('DOMContentLoaded', renderFeed);
