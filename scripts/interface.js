// interface.js
export const elements = {
    loadingIndicator: null,
    debugLogs: null,
    resultDiv: null,
    suggestionsDiv: null,
    mainTitle: null,
    scoreCard: null,
    relatedWords: null,
    wordInput: null,
    dictionarySelection: null,
    debugToggle: null,
    bullshitToggle: null,
    apiKeyInput: null,
    saveApiKeyButton: null,
    apiKeyBadge: null,
    clearHistoryButton: null,
    historyList: null,
    searchButton: null,
    navigationRail: null,
    dictionaryPage: null,
    historyPage: null,
    settingsPage: null
};

const initializeElements = () => {
    elements.loadingIndicator = document.querySelector('#loadingIndicator');
    elements.debugLogs = document.querySelector('#debugLogs');
    elements.resultDiv = document.querySelector('#result');
    elements.suggestionsDiv = document.querySelector('#suggestions');
    elements.mainTitle = document.querySelector('#mainTitle');
    elements.scoreCard = document.querySelector('#scoreCard');
    elements.relatedWords = document.querySelector('#relatedWords');
    elements.wordInput = document.querySelector('#wordInput');
    elements.dictionarySelection = document.querySelector('#dictionarySelection');
    elements.debugToggle = document.querySelector('#debugToggle');
    elements.bullshitToggle = document.querySelector('#bullshitToggle');
    elements.apiKeyInput = document.querySelector('#apiKeyInput');
    elements.saveApiKeyButton = document.querySelector('#saveApiKeyButton');
    elements.apiKeyBadge = document.querySelector('#apiKeyBadge');
    elements.clearHistoryButton = document.querySelector('#clearHistoryButton');
    elements.historyList = document.querySelector('#historyList');
    elements.searchButton = document.querySelector('#searchButton');
    elements.navigationRail = document.querySelector('mdui-navigation-rail');
    elements.dictionaryPage = document.querySelector('#dictionaryPage');
    elements.historyPage = document.querySelector('#historyPage');
    elements.settingsPage = document.querySelector('#settingsPage');

    console.log('Elements initialized:', elements);
    Object.entries(elements).forEach(([key, value]) => {
        if (!value) {
            console.warn(`Element not found: ${key}`);
        }
    });
};

export const initializeUI = () => {
    console.log('Initializing UI');
    initializeElements();
    addEventListeners();
    updateApiKeyUI();
    console.log('UI initialized');
};

const addEventListeners = () => {
    console.log('Adding event listeners');
    elements.searchButton?.addEventListener('click', () => searchAndAddToHistory(elements.wordInput.value));
    elements.wordInput?.addEventListener('keyup', e => e.key === 'Enter' && searchAndAddToHistory(elements.wordInput.value));
    elements.debugToggle?.addEventListener('change', e => window.toggleMode?.('debugMode', e.target.checked));
    elements.bullshitToggle?.addEventListener('change', e => {
        window.toggleMode?.('bullshitMode', e.target.checked);
        updateApiKeyUI();
    });
    elements.apiKeyInput?.addEventListener('input', updateSaveButtonState);
    elements.dictionarySelection?.addEventListener('change', e => window.updateDictionarySelection?.(e.target.value));
    elements.clearHistoryButton?.addEventListener('click', window.clearHistory);
    elements.saveApiKeyButton?.addEventListener('click', window.saveApiKey);
    elements.navigationRail?.addEventListener('change', handleNavigationChange);
    console.log('Event listeners added');
};

const handleNavigationChange = (event) => {
    const selectedValue = event.target.value;
    console.log(`Navigation changed to: ${selectedValue}`);
    
    const pages = {
        recent: elements.dictionaryPage,
        history: elements.historyPage,
        settings: elements.settingsPage
    };

    Object.entries(pages).forEach(([key, page]) => {
        if (page) {
            page.style.display = key === selectedValue ? 'block' : 'none';
        } else {
            console.warn(`Page not found: ${key}`);
        }
    });
};

export const updateApiKeyUI = () => {
    console.log('Updating API Key UI');
    if (elements.apiKeyInput) elements.apiKeyInput.disabled = !window.isBullshitMode;
    if (elements.saveApiKeyButton) elements.saveApiKeyButton.disabled = !window.isBullshitMode || !elements.apiKeyInput?.value;
    if (elements.apiKeyBadge) elements.apiKeyBadge.style.display = window.apiKey ? 'inline-block' : 'none';
    console.log('API Key UI updated');
};

const updateSaveButtonState = () => {
    if (elements.saveApiKeyButton) {
        elements.saveApiKeyButton.disabled = !window.isBullshitMode || !elements.apiKeyInput?.value || elements.apiKeyInput.value === window.apiKey;
    }
};

const selectWord = (word) => {
    console.log(`Word selected: ${word}`);
    if (elements.wordInput) elements.wordInput.value = word;
    if (elements.suggestionsDiv) {
        elements.suggestionsDiv.innerHTML = '';
        elements.suggestionsDiv.style.display = 'none';
    }
    searchAndAddToHistory(word);
};

const searchAndAddToHistory = async (word) => {
    if (!word.trim()) {
        console.log('Empty word, not searching or adding to history');
        return;
    }
    
    try {
        const result = await window.searchWord(word);
        if (result && !result.error) {
            window.addToHistory(word);
            console.log(`Word "${word}" added to history`);
        } else {
            console.log(`Word "${word}" not added to history due to error or no result`);
        }
    } catch (error) {
        console.error(`Error searching for word "${word}":`, error);
    }
};

export const displaySuggestions = (words) => {
    console.log(`Displaying ${words.length} suggestions`);
    if (elements.suggestionsDiv) {
        elements.suggestionsDiv.innerHTML = '';
        words.forEach(word => {
            const chip = document.createElement('mdui-chip');
            chip.textContent = toSentenceCase(word);
            chip.classList.add('suggestion-chip');
            chip.addEventListener('click', () => selectWord(word));
            elements.suggestionsDiv.appendChild(chip);
        });
        elements.suggestionsDiv.style.display = 'flex';
    }
    console.log('Suggestions displayed');
};

export const updateTitle = (word) => {
    console.log(`Updating title for word: ${word}`);
    if (elements.mainTitle) elements.mainTitle.textContent = `Is "${toSentenceCase(word)}" really a word?`;
    document.title = `Is "${toSentenceCase(word)}" really a word?`;
    console.log('Title updated');
};

export const displayDefinition = (data, originalWord) => {
    console.log(`Displaying definition for "${originalWord}"`);
    
    if (window.dictionary.has(originalWord.toLowerCase()) && elements.scoreCard) {
        const score = originalWord.toLowerCase().split('').reduce((score, letter) => 
            score + ({'a':1,'e':1,'i':1,'o':1,'u':1,'l':1,'n':1,'s':1,'t':1,'r':1,'d':2,'g':2,'b':3,'c':3,'m':3,'p':3,'f':4,'h':4,'v':4,'w':4,'y':4,'k':5,'j':8,'x':8,'q':10,'z':10}[letter] || 0), 0);
        elements.scoreCard.innerHTML = `<h1>${score} points</h1>`;
        elements.scoreCard.style.display = 'block';
    } else if (elements.scoreCard) {
        elements.scoreCard.style.display = 'none';
    }

    if (data.error) {
        console.log(`Error in definition: ${data.error}`);
        if (elements.resultDiv) {
            elements.resultDiv.innerHTML = `<p>${data.error}</p>`;
            elements.resultDiv.style.display = 'block';
        }
        if (elements.relatedWords) elements.relatedWords.style.display = 'none';
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
            `<mdui-chip class="word-chip" onclick="window.interface.selectWord('${word}')">${toSentenceCase(word)}</mdui-chip>`
        ).join(' ');
    };

    const addRelatedSection = (title, words) => {
        const validWords = formatWordChips(words);
        if (validWords) {
            return `<h3>${title}:</h3><p>${validWords}</p>`;
        }
        return '';
    };

    if (data.MEANINGS && data.MEANINGS.some(meaning => meaning[2] && meaning[2].length > 0)) {
        relatedWordsHtml += addRelatedSection('Related Words', data.MEANINGS.flatMap(meaning => meaning[2] || []));
    }
    relatedWordsHtml += addRelatedSection('Antonyms', data.ANTONYMS || []);
    relatedWordsHtml += addRelatedSection('Synonyms', data.SYNONYMS || []);

    if (elements.resultDiv) {
        elements.resultDiv.innerHTML = meaningsHtml || "<p>No definition available.</p>";
        elements.resultDiv.style.display = 'block';
    }
    if (elements.relatedWords) {
        elements.relatedWords.innerHTML = relatedWordsHtml;
        elements.relatedWords.style.display = relatedWordsHtml ? 'block' : 'none';
    }

    console.log('Definition displayed');
};

export const updateHistoryList = (history) => {
    console.log('Updating history list');
    if (elements.historyList) {
        elements.historyList.innerHTML = '';
        history.forEach((word, index) => {
            const listItem = document.createElement('mdui-list-item');
            listItem.setAttribute('headline', toSentenceCase(word));
            if (index === 0) {
                listItem.setAttribute('description', 'Most recent');
            }
            listItem.setAttribute('rounded', '');
            listItem.addEventListener('click', () => {
                if (elements.wordInput) elements.wordInput.value = word;
                if (elements.navigationRail) elements.navigationRail.value = 'recent';
                handleNavigationChange({ target: { value: 'recent' } });
                searchAndAddToHistory(word);
            });
            elements.historyList.appendChild(listItem);
        });
    }
    console.log('History list updated');
};

const toSentenceCase = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Initialize UI when the script loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing UI');
    initializeUI();
});

// Export functions that need to be accessed globally
export {
    selectWord,
    searchAndAddToHistory
};

// Attach to window for backwards compatibility and global access
window.interface = {
    selectWord,
    searchAndAddToHistory,
    displaySuggestions,
    updateTitle,
    displayDefinition,
    updateHistoryList,
    updateApiKeyUI
};