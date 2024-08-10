import { elements, initializeUI, updateApiKeyUI, displaySuggestions, updateTitle, displayDefinition } from './interface.js';

const dictionary = new Set();
let meaningData = {};
let apiKey = localStorage.getItem('gpt4ApiKey');
let isDebugMode = localStorage.getItem('debugMode') === 'true';
let isBullshitMode = localStorage.getItem('bullshitMode') === 'true';
let selectedDictionary = localStorage.getItem('selectedDictionary') || 'scrabble-us';

const init = async () => {
    try {
        log('Initializing application...');
        await Promise.all([fetchDictionary(), fetchMeaningData()]);
        initializeUI();
        initializeSettings();
        log('Initialization complete.');
    } catch (error) {
        log(`Error during initialization: ${error.message}`);
    }
};

const initializeSettings = () => {
    elements.debugToggle.checked = isDebugMode;
    elements.bullshitToggle.checked = isBullshitMode;
    elements.debugLogs.style.display = isDebugMode ? 'block' : 'none';
    elements.dictionarySelection.value = selectedDictionary;
    updateApiKeyUI();
};

const log = (message) => {
    console.log(message);
    if (isDebugMode) {
        const timestamp = new Date().toISOString();
        elements.debugLogs.textContent += `[${timestamp}] ${message}\n`;
        elements.debugLogs.scrollTop = elements.debugLogs.scrollHeight;
    }
};

export const toggleMode = (mode, value) => {
    if (mode === 'debugMode') isDebugMode = value;
    else if (mode === 'bullshitMode') isBullshitMode = value;
    localStorage.setItem(mode, value);
    if (mode === 'debugMode') {
        elements.debugLogs.style.display = isDebugMode ? 'block' : 'none';
    }
    log(`${mode} ${value ? 'enabled' : 'disabled'}`);
};

export const updateDictionarySelection = async () => {
    selectedDictionary = elements.dictionarySelection.value;
    localStorage.setItem('selectedDictionary', selectedDictionary);
    log(`Dictionary changed to: ${selectedDictionary}`);
    await fetchDictionary();
};

const fetchData = async (url, errorMessage) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        log(`Error loading ${url}: ${error.message}`);
        mdui.snackbar({ message: errorMessage, timeout: 3000 });
    }
};

const fetchDictionary = async () => {
    const dictionaryFile = selectedDictionary === 'scrabble-uk' ? 'dictionaryUK.txt' : 'dictionaryUS.txt';
    const text = await fetchData(`https://mataleogml.github.io/its-definitely-a-word/${dictionaryFile}`, 'Failed to load dictionary. Some features may not work correctly.');
    if (text) {
        dictionary.clear();
        text.split('\n').forEach(word => dictionary.add(word.trim().toLowerCase()));
        log(`Dictionary loaded successfully. Total words: ${dictionary.size}`);
    }
};

const fetchMeaningData = async () => {
    const data = await fetchData('/dictionary/meaning.json', 'Failed to load meaning data. Some features may not work correctly.');
    if (data) {
        meaningData = JSON.parse(data);
        log('Meaning data loaded successfully.');
    }
};

export const searchWord = async () => {
    try {
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

        if (dictionary.has(input)) {
            log('Exact match found in dictionary');
            await lookupWord(input);
            addToHistory(input);
        } else {
            const matchingWords = Array.from(dictionary).filter(word => new RegExp(`^${input.replace(/\?/g, '.')}$`).test(word));
            log(`Found ${matchingWords.length} matching words`);

            if (matchingWords.length === 1) {
                await lookupWord(matchingWords[0]);
                addToHistory(matchingWords[0]);
            } else if (matchingWords.length > 1) {
                log('Displaying suggestions');
                displaySuggestions(matchingWords);
            } else {
                log('No matches found, looking up input word');
                await lookupWord(input);
                addToHistory(input);
            }
        }

        log('Search complete, hiding loading indicator');
        elements.loadingIndicator.style.display = 'none';
    } catch (error) {
        log(`Error during search: ${error.message}`);
        elements.loadingIndicator.style.display = 'none';
        mdui.snackbar({ message: 'An error occurred during the search. Please try again.', timeout: 3000 });
    }
};

const lookupWord = async (word) => {
    try {
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
    } catch (error) {
        log(`Error looking up word: ${error.message}`);
        mdui.snackbar({ message: 'An error occurred while looking up the word. Please try again.', timeout: 3000 });
    }
};

const generateRelatedWords = (word) => {
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
};

const getGPT4Definition = async (word) => {
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
};

export const lookupWordAndClearSuggestions = (word) => {
    elements.suggestionsDiv.innerHTML = '';
    elements.suggestionsDiv.style.display = 'none';
    elements.wordInput.value = word;
    lookupWord(word);
};

export const saveApiKey = () => {
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
};

const addToHistory = (word) => {
    // This function should be implemented in history.js
    // Here we just call it, assuming it's available globally
    if (typeof window.addToHistory === 'function') {
        window.addToHistory(word);
    }
};

export const clearHistory = () => {
    // This function should be implemented in history.js
    // Here we just call it, assuming it's available globally
    if (typeof window.clearHistory === 'function') {
        window.clearHistory();
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', init);

// Export functions and variables that need to be accessed globally
export {
    dictionary,
    isBullshitMode,
    apiKey
};

// Also attach to window for backwards compatibility
Object.assign(window, {
    searchWord,
    lookupWordAndClearSuggestions,
    saveApiKey,
    updateDictionarySelection,
    toggleMode,
    clearHistory,
    dictionary,
    isBullshitMode,
    apiKey
});