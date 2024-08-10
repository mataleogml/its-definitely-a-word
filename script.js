const dictionary = new Set();
let apiKey = localStorage.getItem('gpt4ApiKey');
const settingsDialog = document.getElementById('settingsDialog');
const loadingIndicator = document.getElementById('loadingIndicator');
const debugLogs = document.getElementById('debugLogs');
const resultDiv = document.getElementById('result');
const suggestionsDiv = document.getElementById('suggestions');
const mainTitle = document.getElementById('mainTitle');
let isDebugMode = localStorage.getItem('debugMode') === 'true';
let isBullshitMode = localStorage.getItem('bullshitMode') === 'true';

// Fetch dictionary when the page loads
fetchDictionary();

// Add event listeners
document.getElementById('searchButton').addEventListener('click', searchWord);
document.getElementById('wordInput').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        searchWord();
    }
});
document.getElementById('debugToggle').addEventListener('change', toggleDebugMode);
document.getElementById('bullshitToggle').addEventListener('change', toggleBullshitMode);
document.getElementById('settingsButton').addEventListener('click', () => settingsDialog.open = true);
document.getElementById('closeDialogButton').addEventListener('click', () => settingsDialog.open = false);
document.getElementById('saveApiKeyButton').addEventListener('click', saveApiKey);

// Initialize settings
document.getElementById('debugToggle').checked = isDebugMode;
document.getElementById('bullshitToggle').checked = isBullshitMode;
debugLogs.style.display = isDebugMode ? 'block' : 'none';

function log(message) {
    console.log(message); // Always log to console for debugging
    if (isDebugMode) {
        const timestamp = new Date().toISOString();
        debugLogs.textContent += `[${timestamp}] ${message}\n`;
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }
}

function toggleDebugMode(event) {
    isDebugMode = event.target.checked;
    localStorage.setItem('debugMode', isDebugMode);
    debugLogs.style.display = isDebugMode ? 'block' : 'none';
    log('Debug mode ' + (isDebugMode ? 'enabled' : 'disabled'));
}

function toggleBullshitMode(event) {
    isBullshitMode = event.target.checked;
    localStorage.setItem('bullshitMode', isBullshitMode);
    log('Bullshit mode ' + (isBullshitMode ? 'enabled' : 'disabled'));
}

async function fetchDictionary() {
    log('Fetching dictionary...');
    try {
        const response = await fetch('dictionary.txt');
        const text = await response.text();
        const words = text.split('\n').map(word => word.trim().toLowerCase());
        words.forEach(word => dictionary.add(word));
        log(`Dictionary loaded successfully. Total words: ${dictionary.size}`);
    } catch (error) {
        console.error('Error loading dictionary:', error);
        log('Error loading dictionary: ' + error.message);
        mdui.snackbar({
            message: 'Failed to load dictionary. Some features may not work correctly.',
            timeout: 3000
        });
    }
}

async function searchWord() {
    const input = document.getElementById('wordInput').value.trim().toLowerCase();

    if (input.length === 0 || input.length > 15 || /[\s-]/.test(input)) {
        mdui.snackbar({
            message: 'Please enter a valid word (max 15 letters, no spaces or hyphens).',
            timeout: 2000
        });
        return;
    }

    log(`Searching for word: ${input}`);
    loadingIndicator.style.display = 'block';
    resultDiv.style.display = 'none';
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';

    const matchingWords = findMatchingWords(input);
    if (matchingWords.length === 1) {
        await lookupWord(matchingWords[0]);
    } else if (matchingWords.length > 1) {
        displaySuggestions(matchingWords);
    } else {
        // No matching words found
        await lookupWord(input);
    }

    loadingIndicator.style.display = 'none';
}

function findMatchingWords(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\?/g, '.') + '$');
    return Array.from(dictionary).filter(word => regex.test(word));
}

function displaySuggestions(words) {
    suggestionsDiv.innerHTML = '';
    if (words.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    words.forEach(word => {
        const chip = document.createElement('mdui-chip');
        chip.textContent = word;
        chip.classList.add('suggestion-chip');
        chip.addEventListener('click', () => selectWord(word, chip));
        suggestionsDiv.appendChild(chip);
    });

    suggestionsDiv.style.display = 'flex';
}

function selectWord(word, chip) {
    // Remove 'elevated' attribute from all chips
    suggestionsDiv.querySelectorAll('mdui-chip').forEach(c => c.removeAttribute('elevated'));
    
    // Add 'elevated' attribute to the selected chip
    chip.setAttribute('elevated', '');

    updateTitle(word);
    lookupWord(word);
}

async function lookupWord(word) {
    log(`Looking up word: ${word}`);
    loadingIndicator.style.display = 'block';
    resultDiv.style.display = 'none';
    document.getElementById('relatedWords').style.display = 'none';
    document.getElementById('scoreCard').style.display = 'none';
    suggestionsDiv.style.display = 'none';

    updateTitle(word);

    let definition;
    if (isBullshitMode) {
        log('Bullshit mode enabled. Using GPT-4 API for definition.');
        definition = await getGPT4Definition(word);
    } else if (dictionary.has(word.toLowerCase())) {
        log('Word found in Scrabble dictionary. Fetching meaning from JSON.');
        definition = await fetchMeaningFromJson(word);
        if (definition.error) {
            definition = { error: `"${word}" is not a word.` };
        }
    } else {
        log('Word not found in dictionary.');
        definition = { error: `"${word}" is not a word.` };
    }
    log(`Definition received: ${JSON.stringify(definition)}`);

    displayDefinition(definition, word);
    loadingIndicator.style.display = 'none';
}

function updateTitle(word) {
    mainTitle.textContent = `Is "${word}" really a word?`;
    document.title = `Is "${word}" really a word?`;
}

async function fetchMeaningFromJson(word) {
    log(`Fetching meaning for "${word}" from JSON`);
    try {
        const response = await fetch('meaning.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        log(`JSON data received for "${word}"`);
        return data[word.toUpperCase()] || { error: "Meaning not found in JSON file." };
    } catch (error) {
        console.error('Error fetching meaning from JSON:', error);
        log('Error fetching meaning from JSON: ' + error.message);
        return { error: "Error fetching meaning from JSON file." };
    }
}

async function getGPT4Definition(word) {
    if (!apiKey) {
        log('No API key set. Cannot use GPT-4 API.');
        return { error: "API key not set. Please set your API key in the settings." };
    }

    const prompt = `Create a fictional, humorous definition for the word "${word}" in the following JSON format:
       {
           "MEANINGS": [
               ["Part of Speech", "Definition", ["Related Words"], []]
           ],
           "ANTONYMS": [],
           "SYNONYMS": []
       }
       Be creative and entertaining!`;

    log(`Sending prompt to GPT-4 API: "${prompt}"`);

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const definition = JSON.parse(response.data.choices[0].message.content.trim());
        log(`Received definition from API: ${JSON.stringify(definition)}`);
        return definition;
    } catch (error) {
        console.error('Error:', error);
        log('Error fetching definition: ' + error.message);
        return { error: "An error occurred while fetching the definition. Please check your API key and try again." };
    }
}

function calculateScrabbleScore(word) {
    const scoreMap = {
        'a': 1, 'e': 1, 'i': 1, 'o': 1, 'u': 1, 'l': 1, 'n': 1, 's': 1, 't': 1, 'r': 1,
        'd': 2, 'g': 2,
        'b': 3, 'c': 3, 'm': 3, 'p': 3,
        'f': 4, 'h': 4, 'v': 4, 'w': 4, 'y': 4,
        'k': 5,
        'j': 8, 'x': 8,
        'q': 10, 'z': 10
    };

    return word.toLowerCase().split('').reduce((score, letter) => score + (scoreMap[letter] || 0), 0);
}

function displayDefinition(data, originalWord) {
    log(`Displaying definition for "${originalWord}": ${JSON.stringify(data)}`);
    if (data.error) {
        resultDiv.innerHTML = `<p>${data.error}</p>`;
        resultDiv.style.display = 'block';
        document.getElementById('relatedWords').style.display = 'none';
        document.getElementById('scoreCard').style.display = 'none';
        return;
    }

    // Calculate and display the Scrabble score
    const score = calculateScrabbleScore(originalWord);
    const scoreCard = document.getElementById('scoreCard');
    scoreCard.innerHTML = `<h1>${score} points</h1>`;
    scoreCard.style.display = 'block';

    let meaningsHtml = '';
    let relatedWordsHtml = '';

    if (data.MEANINGS && data.MEANINGS.length > 0) {
        meaningsHtml += '<h3>Meanings:</h3>';
        data.MEANINGS.forEach(meaning => {
            if (meaning[1]) {  // Only display if definition is not empty
                meaningsHtml += `<p><strong>${meaning[0]}:</strong> ${meaning[1]}</p>`;
            }
        });
    }

    // Combine Related Words, Antonyms, and Synonyms
    let hasRelatedContent = false;

    if (data.MEANINGS && data.MEANINGS.some(meaning => meaning[2] && meaning[2].length > 0)) {
        relatedWordsHtml += '<h3>Related Words:</h3>';
        data.MEANINGS.forEach(meaning => {
            if (meaning[2] && meaning[2].length > 0) {
                const validRelatedWords = formatWordChips(meaning[2], originalWord);
                if (validRelatedWords) {
                    relatedWordsHtml += `<p>${validRelatedWords}</p>`;
                    hasRelatedContent = true;
                }
            }
        });
    }

    if (data.ANTONYMS && data.ANTONYMS.length > 0) {
        const validAntonyms = formatWordChips(data.ANTONYMS, originalWord);
        if (validAntonyms) {
            relatedWordsHtml += `<h3>Antonyms:</h3><p>${validAntonyms}</p>`;
            hasRelatedContent = true;
        }
    }

    if (data.SYNONYMS && data.SYNONYMS.length > 0) {
        const validSynonyms = formatWordChips(data.SYNONYMS, originalWord);
        if (validSynonyms) {
            relatedWordsHtml += `<h3>Synonyms:</h3><p>${validSynonyms}</p>`;
            hasRelatedContent = true;
        }
    }

    resultDiv.innerHTML = meaningsHtml;
    resultDiv.style.display = meaningsHtml ? 'block' : 'none';

    const relatedWordsDiv = document.getElementById('relatedWords');
    relatedWordsDiv.innerHTML = relatedWordsHtml;
    relatedWordsDiv.style.display = hasRelatedContent ? 'block' : 'none';

    log(`Definition displayed for "${originalWord}"`);
}

function formatWordChips(words, originalWord) {
    const validWords = words.filter(word => 
        dictionary.has(word.toLowerCase()) && word.toLowerCase() !== originalWord.toLowerCase()
    );

    if (validWords.length === 0) return '';

    return validWords.map(word => 
        `<mdui-chip class="word-chip" onclick="lookupWordAndClearSuggestions('${word}')">${word}</mdui-chip>`
    ).join(' ');
}

function lookupWordAndClearSuggestions(word) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';
    document.getElementById('wordInput').value = word;
    lookupWord(word);
}

function saveApiKey() {
    const inputApiKey = document.getElementById('apiKeyInput').value;
    if (inputApiKey) {
        apiKey = inputApiKey;
        localStorage.setItem('gpt4ApiKey', apiKey);
        settingsDialog.open = false;
        log('API Key saved successfully');
        mdui.snackbar({
            message: 'API Key saved successfully!',
            timeout: 2000
        });
    } else {
        log('Invalid API Key entered');
        mdui.snackbar({
            message: 'Please enter a valid API Key.',
            timeout: 2000
        });
    }
}