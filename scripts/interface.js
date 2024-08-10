// interface.js
export const elements = {
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
    apiKeyBadge: document.getElementById('apiKeyBadge'),
    clearHistoryButton: document.getElementById('clearHistoryButton'),
    historyDialog: document.getElementById('historyDialog'),
    historyButton: document.getElementById('historyButton'),
    closeHistoryDialogButton: document.getElementById('closeHistoryDialogButton'),
    historyList: document.getElementById('historyList')
};

export const initializeUI = () => {
    console.log('Initializing UI');
    addEventListeners();
    updateApiKeyUI();
    console.log('UI initialized');
};

const addEventListeners = () => {
    console.log('Adding event listeners');
    document.addEventListener('click', handleClick);
    elements.wordInput?.addEventListener('keyup', e => e.key === 'Enter' && window.searchWord?.());
    elements.debugToggle?.addEventListener('change', e => window.toggleMode?.('debugMode', e.target.checked));
    elements.bullshitToggle?.addEventListener('change', e => {
        window.toggleMode?.('bullshitMode', e.target.checked);
        updateApiKeyUI();
    });
    elements.apiKeyInput?.addEventListener('input', updateSaveButtonState);
    elements.dictionarySelection?.addEventListener('change', window.updateDictionarySelection);
    elements.historyButton?.addEventListener('click', () => elements.historyDialog.open = true);
    elements.closeHistoryDialogButton?.addEventListener('click', () => elements.historyDialog.open = false);
    console.log('Event listeners added');
};

const handleClick = (e) => {
    const target = e.target;
    if (target.id === 'searchButton') window.searchWord?.();
    else if (target.id === 'settingsButton') elements.settingsDialog.open = true;
    else if (target.id === 'closeDialogButton') elements.settingsDialog.open = false;
    else if (target.id === 'saveApiKeyButton') window.saveApiKey?.();
    else if (target.id === 'clearHistoryButton') window.clearHistory?.();
};

export const updateApiKeyUI = () => {
    console.log('Updating API Key UI');
    elements.apiKeyInput.disabled = !window.isBullshitMode;
    elements.saveApiKeyButton.disabled = !window.isBullshitMode || !elements.apiKeyInput.value;
    elements.apiKeyBadge.style.display = window.apiKey ? 'inline-block' : 'none';
    console.log('API Key UI updated');
};

const updateSaveButtonState = () => {
    elements.saveApiKeyButton.disabled = !window.isBullshitMode || !elements.apiKeyInput.value || elements.apiKeyInput.value === window.apiKey;
};

export const displaySuggestions = (words) => {
    console.log(`Displaying ${words.length} suggestions`);
    elements.suggestionsDiv.innerHTML = ''; // Clear previous suggestions
    words.forEach(word => {
        const chip = document.createElement('mdui-chip');
        chip.textContent = toSentenceCase(word);
        chip.classList.add('suggestion-chip');
        chip.addEventListener('click', () => selectWord(word));
        elements.suggestionsDiv.appendChild(chip);
    });
    elements.suggestionsDiv.style.display = 'flex';
    console.log('Suggestions displayed');
};

const selectWord = (word) => {
    console.log(`Word selected: ${word}`);
    elements.wordInput.value = word; // Update the input field with the selected word
    elements.suggestionsDiv.innerHTML = ''; // Clear suggestions
    elements.suggestionsDiv.style.display = 'none';
    window.searchWord(); // Trigger a new search with the selected word
};

export const updateTitle = (word) => {
    console.log(`Updating title for word: ${word}`);
    elements.mainTitle.textContent = `Is "${toSentenceCase(word)}" really a word?`;
    document.title = `Is "${toSentenceCase(word)}" really a word?`;
    console.log('Title updated');
};

export const displayDefinition = (data, originalWord) => {
    console.log(`Displaying definition for "${originalWord}"`);
    
    if (window.dictionary.has(originalWord.toLowerCase())) {
        const score = originalWord.toLowerCase().split('').reduce((score, letter) => 
            score + ({'a':1,'e':1,'i':1,'o':1,'u':1,'l':1,'n':1,'s':1,'t':1,'r':1,'d':2,'g':2,'b':3,'c':3,'m':3,'p':3,'f':4,'h':4,'v':4,'w':4,'y':4,'k':5,'j':8,'x':8,'q':10,'z':10}[letter] || 0), 0);
        elements.scoreCard.innerHTML = `<h1>${score} points</h1>`;
        elements.scoreCard.style.display = 'block';
    } else {
        elements.scoreCard.style.display = 'none';
    }

    if (data.error) {
        console.log(`Error in definition: ${data.error}`);
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
            .filter(word => window.dictionary.has(word) && word !== originalWord.toLowerCase())
            .sort((a, b) => a.localeCompare(b));
        return validWords.map(word => 
            `<mdui-chip class="word-chip" onclick="window.lookupWordAndClearSuggestions('${word}')">${toSentenceCase(word)}</mdui-chip>`
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

    console.log('Definition displayed');
};

export const updateHistoryList = (history) => {
    console.log('Updating history list');
    elements.historyList.innerHTML = '';
    history.forEach(word => {
        const listItem = document.createElement('li');
        listItem.className = 'mdui-list-item mdui-ripple';
        listItem.textContent = word;
        listItem.addEventListener('click', () => {
            elements.wordInput.value = word;
            elements.historyDialog.open = false;
            window.searchWord();
        });
        elements.historyList.appendChild(listItem);
    });
    console.log('History list updated');
};

const toSentenceCase = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Initialize UI when the script loads
initializeUI();
document.addEventListener('DOMContentLoaded', initializeUI);