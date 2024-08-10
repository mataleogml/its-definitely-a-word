// history.js

import { updateHistoryList } from './interface.js';
import { searchWord } from './script.js';

let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

export const addToHistory = (word) => {
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== word.toLowerCase());
    searchHistory.unshift(word);
    if (searchHistory.length > 50) {
        searchHistory = searchHistory.slice(0, 50);
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    updateHistoryList(searchHistory);
};

export const clearHistory = () => {
    searchHistory = [];
    localStorage.removeItem('searchHistory');
    updateHistoryList(searchHistory);
};

export const initializeHistory = () => {
    updateHistoryList(searchHistory);
};

export const removeFromHistory = (word) => {
    const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    const updatedHistory = history.filter(item => item !== word);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    updateHistoryList(updatedHistory);
};

window.removeFromHistory = removeFromHistory;

// Initialize the history when the page loads
document.addEventListener('DOMContentLoaded', initializeHistory);

// Expose functions to window object for backwards compatibility
window.addToHistory = addToHistory;
window.clearHistory = clearHistory;