const dictionary = new Set();
let meaningData = {};
let apiKey = localStorage.getItem('gpt4ApiKey');
const elements = {
    settingsDialog: document.getElementById('settingsDialog'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    debugLogs: document.getElementById('debugLogs'),
    resultDiv: document.getElementById('result'),
    suggestionsDiv: document.getElementById('suggestions'),
    mainTitle: document.getElementById('mainTitle'),
    scoreCard: document.getElementById('scoreCard'),
    relatedWords: document.getElementById('relatedWords'),
    wordInput: document.getElementById('wordInput'),
    dictionarySelection: document.getElementById('dictionarySelection'),
    debugToggle: document.getElementById('debugToggle'),
    bullshitToggle: document.getElementById('bullshitToggle'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveApiKeyButton: document.getElementById('saveApiKeyButton'),
    apiKeyBadge: document.getElementById('apiKeyBadge')
};
let isDebugMode = localStorage.getItem('debugMode') === 'true';
let isBullshitMode = localStorage.getItem('bullshitMode') === 'true';
let selectedDictionary = localStorage.getItem('selectedDictionary') || 'scrabble-us';

(async function init() {
    await Promise.all([fetchDictionary(), fetchMeaningData()]);
    addEventListeners();
    initializeSettings();
})();

function addEventListeners() {
    document.getElementById('searchButton').addEventListener('click', searchWord);
    elements.wordInput.addEventListener('keyup', e => e.key === 'Enter' && searchWord());
    elements.debugToggle.addEventListener('change', e => toggleMode('debugMode', e.target.checked));
    elements.bullshitToggle.addEventListener('change', e => {
        toggleMode('bullshitMode', e.target.checked);
        updateApiKeyUI();
    });
    document.getElementById('settingsButton').addEventListener('click', () => elements.settingsDialog.open = true);
    document.getElementById('closeDialogButton').addEventListener('click', () => elements.settingsDialog.open = false);
    elements.saveApiKeyButton.addEventListener('click', saveApiKey);
    elements.apiKeyInput.addEventListener('input', updateSaveButtonState);
    elements.dictionarySelection.addEventListener('change', updateDictionarySelection);
}

function initializeSettings() {
    elements.debugToggle.checked = isDebugMode;
    elements.bullshitToggle.checked = isBullshitMode;
    elements.debugLogs.style.display = isDebugMode ? 'block' : 'none';
    elements.dictionarySelection.value = selectedDictionary;
    updateApiKeyUI();
}

function log(message) {
    console.log(message);
    if (isDebugMode) {
        const timestamp = new Date().toISOString();
        elements.debugLogs.textContent += `[${timestamp}] ${message}\n`;
        elements.debugLogs.scrollTop = elements.debugLogs.scrollHeight;
    }
}

function toggleMode(mode, value) {
    if (mode === 'debugMode') isDebugMode = value;
    else if (mode === 'bullshitMode') isBullshitMode = value;
    localStorage.setItem(mode, value);
    if (mode === 'debugMode') {
        elements.debugLogs.style.display = isDebugMode ? 'block' : 'none';
    }
    log(`${mode} ${value ? 'enabled' : 'disabled'}`);
}

function updateApiKeyUI() {
    elements.apiKeyInput.disabled = !isBullshitMode;
    elements.saveApiKeyButton.disabled = !isBullshitMode || !elements.apiKeyInput.value;
    elements.apiKeyBadge.style.display = apiKey ? 'inline-block' : 'none';
}

function updateSaveButtonState() {
    elements.saveApiKeyButton.disabled = !isBullshitMode || !elements.apiKeyInput.value || elements.apiKeyInput.value === apiKey;
}

async function updateDictionarySelection() {
    selectedDictionary = elements.dictionarySelection.value;
    localStorage.setItem('selectedDictionary', selectedDictionary);
    log(`Dictionary changed to: ${selectedDictionary}`);
    await fetchDictionary();
}

async function fetchData(url, errorMessage) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        log(`Error loading ${url}: ${error.message}`);
        mdui.snackbar({ message: errorMessage, timeout: 3000 });
    }
}

async function fetchDictionary() {
    const dictionaryFile = selectedDictionary === 'scrabble-uk' ? 'dictionaryUK.txt' : 'dictionaryUS.txt';
    const text = await fetchData(`${dictionaryFile}`, 'Failed to load dictionary. Some features may not work correctly.');
    if (text) {
        dictionary.clear();
        text.split('\n').forEach(word => dictionary.add(word.trim().toLowerCase()));
        log(`Dictionary loaded successfully. Total words: ${dictionary.size}`);
    }
}

async function fetchMeaningData() {
    const data = await fetchData('meaning.json', 'Failed to load meaning data. Some features may not work correctly.');
    if (data) {
        meaningData = JSON.parse(data);
        log('Meaning data loaded successfully.');
    }
}

async function searchWord() {
    const input = elements.wordInput.value.trim().toLowerCase();
    if (input.length === 0 || input.length > 15 || /[\s-]/.test(input)) {
        mdui.snackbar({ message: 'Please enter a valid word (max 15 letters, no spaces or hyphens).', timeout: 2000 });
        return;
    }

    log(`Searching for word: ${input}`);
    elements.loadingIndicator.style.display = 'block';
    elements.resultDiv.style.display = 'none';
    elements.suggestionsDiv.innerHTML = '';
    elements.suggestionsDiv.style.display = 'none';

    const matchingWords = Array.from(dictionary).filter(word => new RegExp(`^${input.replace(/\?/g, '.')}$`).test(word));
    if (matchingWords.length === 1) await lookupWord(matchingWords[0]);
    else if (matchingWords.length > 1) displaySuggestions(matchingWords);
    else await lookupWord(input);

    elements.loadingIndicator.style.display = 'none';
}

function displaySuggestions(words) {
    words.forEach(word => {
        const chip = document.createElement('mdui-chip');
        chip.textContent = toSentenceCase(word);
        chip.classList.add('suggestion-chip');
        chip.addEventListener('click', () => selectWord(word, chip));
        elements.suggestionsDiv.appendChild(chip);
    });
    elements.suggestionsDiv.style.display = 'flex';
}

function selectWord(word, chip) {
    elements.suggestionsDiv.querySelectorAll('mdui-chip').forEach(c => c.removeAttribute('elevated'));
    chip.setAttribute('elevated', '');
    updateTitle(word);
    lookupWord(word);
}

async function lookupWord(word) {
    log(`Looking up word: ${word}`);
    updateTitle(word);

    let definition;
    if (dictionary.has(word.toLowerCase())) {
        log('Word found in selected Scrabble dictionary.');
        definition = meaningData[word.toUpperCase()] || generateRelatedWords(word);
    } else {
        log('Word not found in selected dictionary.');
        definition = { error: `"${word}" is not a word in the selected Scrabble dictionary.` };
    }

    if (isBullshitMode && (!definition || definition.error)) {
        log('Bullshit mode enabled and word not found. Using GPT-4 API for definition.');
        definition = await getGPT4Definition(word);
    }

    log(`Definition: ${JSON.stringify(definition)}`);
    displayDefinition(definition, word);
}

function generateRelatedWords(word) {
    log(`Generating related words for: ${word}`);
    const relatedWords = new Set();
    const lowerWord = word.toLowerCase();

    for (const [key, value] of Object.entries(meaningData)) {
        if (dictionary.has(key.toLowerCase())) {
            const allRelated = [
                ...(value.MEANINGS ? value.MEANINGS.flatMap(m => m[2] || []) : []),
                ...(value.ANTONYMS || []),
                ...(value.SYNONYMS || [])
            ];
            if (allRelated.some(w => w.toLowerCase() === lowerWord)) {
                relatedWords.add(key);
            }
        }
    }

    log(`Generated related words: ${JSON.stringify([...relatedWords])}`);
    return { MEANINGS: [], ANTONYMS: [], SYNONYMS: [...relatedWords] };
}

function updateTitle(word) {
    elements.mainTitle.textContent = `Is "${toSentenceCase(word)}" really a word?`;
    document.title = `Is "${toSentenceCase(word)}" really a word?`;
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

        return JSON.parse(response.data.choices[0].message.content.trim());
    } catch (error) {
        console.error('Error:', error);
        log('Error fetching definition: ' + error.message);
        return { error: "An error occurred while fetching the definition. Please check your API key and try again." };
    }
}

function displayDefinition(data, originalWord) {
    log(`Displaying definition for "${originalWord}": ${JSON.stringify(data)}`);
    
    if (dictionary.has(originalWord.toLowerCase())) {
        const score = originalWord.toLowerCase().split('').reduce((score, letter) => 
            score + ({'a':1,'e':1,'i':1,'o':1,'u':1,'l':1,'n':1,'s':1,'t':1,'r':1,'d':2,'g':2,'b':3,'c':3,'m':3,'p':3,'f':4,'h':4,'v':4,'w':4,'y':4,'k':5,'j':8,'x':8,'q':10,'z':10}[letter] || 0), 0);
        elements.scoreCard.innerHTML = `<h1>${score} points</h1>`;
        elements.scoreCard.style.display = 'block';
    } else {
        elements.scoreCard.style.display = 'none';
    }

    if (data.error) {
        elements.resultDiv.innerHTML = `<p>${data.error}</p>`;
        elements.resultDiv.style.display = 'block';
        elements.relatedWords.style.display = 'none';
        return;
    }

    let meaningsHtml = '';
    let relatedWordsHtml = '';

    if (data.MEANINGS && data.MEANINGS.length > 0) {
        meaningsHtml += '<h3>Meanings:</h3>';
        data.MEANINGS.forEach(meaning => {
            if (meaning[1]) meaningsHtml += `<p><strong>${meaning[0]}:</strong> ${meaning[1]}</p>`;
        });
    }

    const formatWordChips = words => {
        const uniqueWords = new Set(words.map(word => word.toLowerCase()));
        const validWords = Array.from(uniqueWords)
            .filter(word => dictionary.has(word) && word !== originalWord.toLowerCase())
            .sort((a, b) => a.localeCompare(b));
        return validWords.map(word => 
            `<mdui-chip class="word-chip" onclick="lookupWordAndClearSuggestions('${word}')">${toSentenceCase(word)}</mdui-chip>`
        ).join(' ');
    };

    const addRelatedSection = (title, words) => {
        const validWords = formatWordChips(words);
        if (validWords) {
            relatedWordsHtml += `<h3>${title}:</h3><p>${validWords}</p>`;
            return true;
        }
        return false;
    };

    let hasRelatedContent = false;
    if (data.MEANINGS && data.MEANINGS.some(meaning => meaning[2] && meaning[2].length > 0)) {
        hasRelatedContent |= addRelatedSection('Related Words', data.MEANINGS.flatMap(meaning => meaning[2] || []));
    }
    hasRelatedContent |= addRelatedSection('Antonyms', data.ANTONYMS || []);
    hasRelatedContent |= addRelatedSection('Synonyms', data.SYNONYMS || []);

    elements.resultDiv.innerHTML = meaningsHtml || "<p>No definition available.</p>";
    elements.resultDiv.style.display = 'block';
    elements.relatedWords.innerHTML = relatedWordsHtml;
    elements.relatedWords.style.display = hasRelatedContent ? 'block' : 'none';

    log(`Definition displayed for "${originalWord}"`);
}

function lookupWordAndClearSuggestions(word) {
    elements.suggestionsDiv.innerHTML = '';
    elements.suggestionsDiv.style.display = 'none';
    elements.wordInput.value = word;
    lookupWord(word);
}

function saveApiKey() {
    const inputApiKey = elements.apiKeyInput.value;
    if (inputApiKey) {
        apiKey = inputApiKey;
        localStorage.setItem('gpt4ApiKey', apiKey);
        elements.settingsDialog.open = false;
        updateApiKeyUI();
        log('API Key saved successfully');
        mdui.snackbar({ message: 'API Key saved successfully!', timeout: 2000 });
    } else {
        log('Invalid API Key entered');
        mdui.snackbar({ message: 'Please enter a valid API Key.', timeout: 2000 });
    }
}

function toSentenceCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}