document.addEventListener('DOMContentLoaded', function() {
    const userDetailsForm = document.getElementById('userDetailsForm');
    const fitnessQuestionForm = document.getElementById('fitnessQuestionForm');
    const submitButton = fitnessQuestionForm.querySelector('button[type="submit"]');
    const chatbox = document.getElementById('chatbox');
    const questionInput = document.getElementById('questionInput');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Load and display chat history from localStorage on page load
    loadChatHistory();

    // Load user details from localStorage on page load
    loadUserDetails();

    userDetailsForm.onsubmit = async function(e) {
        e.preventDefault();
        const location = document.getElementById('location').value.trim();
        const solarPanels = document.getElementById('solarPanels').value.trim();
        if (!location || !solarPanels) return;

        // Save user details to the session and localStorage
        try {
            await fetch('/save-user-details', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ location, solarPanels })
            });
            localStorage.setItem('location', location);
            localStorage.setItem('solarPanels', solarPanels);
        } catch (error) {
            console.error('Error saving user details:', error);
            return;
        }

        userDetailsForm.style.display = 'none';
        fitnessQuestionForm.style.display = 'flex';

        // Display thank you message
        displayBotMessage("Bedankt voor het invullen van je gegevens. Je kunt me nu vragen stellen over je energieopwekking!");
    };

    fitnessQuestionForm.onsubmit = async function(e) {
        e.preventDefault();
        const question = questionInput.value.trim();
        if (!question) return;
        questionInput.value = '';

        saveAndDisplayMessage(question, 'user');

        submitButton.disabled = true;
        submitButton.classList.add('loading-button');

        try {
            const response = await fetch('/ask-energy-bot', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ question })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            saveAndDisplayMessage(data.answer, 'bot');
        } catch (error) {
            console.error('Error:', error);
            saveAndDisplayMessage("Sorry, there was an error processing your request. Please try again later.", 'bot');
        }

        submitButton.disabled = false;
        submitButton.classList.remove('loading-button');
    };

    clearHistoryBtn.addEventListener('click', async function() {
        localStorage.removeItem('chatHistory');
        localStorage.removeItem('location');
        localStorage.removeItem('solarPanels');
        chatbox.innerHTML = '';
        userDetailsForm.style.display = 'flex';
        fitnessQuestionForm.style.display = 'none';
        displayBotWelcomeMessage(); // Ensure the welcome message is shown
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
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        if (chatHistory.length === 0) {
            const welcomeMessage = "Hallo! Om je van nauwkeurig energieadvies te voorzien, heb ik wat informatie van je nodig. Kun je me vertellen waar je woont en hoeveel zonnepanelen je hebt?";
            saveAndDisplayMessage(welcomeMessage, 'bot');
        }
    }

    function displayBotMessage(message) {
        saveAndDisplayMessage(message, 'bot');
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
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    function saveMessageToLocalStorage(message, sender) {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        chatHistory.push({ message, sender });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    function loadChatHistory() {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        chatHistory.forEach(({ message, sender }) => displayMessage(message, sender));

        if (chatHistory.length === 0) {
            displayBotWelcomeMessage(); // Ensure welcome message is displayed on first load
        }
    }

    function loadUserDetails() {
        const location = localStorage.getItem('location');
        const solarPanels = localStorage.getItem('solarPanels');
        if (location && solarPanels) {
            userDetailsForm.style.display = 'none';
            fitnessQuestionForm.style.display = 'flex';
            displayBotMessage("Thank you for providing your information. Feel free to ask me any questions about energy consumption!");
        } else {
            displayBotWelcomeMessage(); // Ensure welcome message is displayed if no user details
        }
    }
});
