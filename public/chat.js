document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('fitnessQuestionForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const chatbox = document.getElementById('chatbox');
    const questionInput = document.getElementById('questionInput');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn'); // Get the clear history button

    // Load and display chat history from localStorage on page load
    loadChatHistory();

    // Automatically display a welcome message from the bot
    displayBotWelcomeMessage();

    form.onsubmit = async function(e) {
        e.preventDefault();
        const question = questionInput.value.trim();
        if (!question) return; // Prevent empty queries
        questionInput.value = ''; // Clear input after sending

        saveAndDisplayMessage(question, 'user');

        submitButton.disabled = true; // Disable the button to prevent multiple submissions
        submitButton.classList.add('loading-button'); // Add spinning effect

        try {
            const response = await fetch('/ask-fitness-bot', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ question: question }),
            });
            const data = await response.json();
            saveAndDisplayMessage(data.answer, 'bot');
        } catch (error) {
            console.error('Error:', error);
            saveAndDisplayMessage("Sorry, there was an error processing your request. Please try again later.", 'bot');
        }

        submitButton.disabled = false; // Re-enable the button
        submitButton.classList.remove('loading-button'); // Remove spinning effect
    };

    clearHistoryBtn.addEventListener('click', async function() {
        localStorage.removeItem('chatHistory'); // Clear local storage
        chatbox.innerHTML = ''; // Clear displayed messages
        try {
            await fetch('/clear-history', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'}
            });
            console.log('Session history cleared successfully.');
        } catch (error) {
            console.error('Error clearing session history:', error);
        }
    });

    function displayBotWelcomeMessage() {
        // Check if it's the user's first visit or if chat history is empty
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        if (chatHistory.length === 0) {
            const welcomeMessage = "Hey bro ready to get big? 💪 First give me some info to see where you are at. Tell me your age, length, weight and how many times you exercise per week and for how long. Tell me about your fitness goals, any specific health concerns, or ask me anything fitness-related. Let's go!";
            saveAndDisplayMessage(welcomeMessage, 'bot');
        }
    }

    function saveAndDisplayMessage(message, sender) {
        displayMessage(message, sender);
        saveMessageToLocalStorage(message, sender);
    }

    function displayMessage(message, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender + '-message');
        msgDiv.textContent = message;
        chatbox.appendChild(msgDiv);
        chatbox.scrollTop = chatbox.scrollHeight; // Automatically scroll to the newest message
    }

    function saveMessageToLocalStorage(message, sender) {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        chatHistory.push({ message, sender });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    function loadChatHistory() {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        chatHistory.forEach(({ message, sender }) => displayMessage(message, sender));
    }
});
