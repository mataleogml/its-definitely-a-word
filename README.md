# Its Definitely a Word

## Overview

"Its definitely a word" is an interactive web application that allows users to look up words, check their validity, and explore their meanings. It combines a Scrabble dictionary, a custom JSON meanings file, and the GPT-4 API to provide comprehensive word information.

## Features

- Word lookup in a Scrabble dictionary
- Display of word definitions from a custom JSON file
- Scrabble score calculation for valid words
- "Bullshit Mode" for creative definitions using GPT-4 API
- Wildcard search support (use '?' for unknown letters)
- Display of related words, antonyms, and synonyms
- Interactive word chips for easy navigation between related words
- Debug mode for troubleshooting

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- MDUI for UI components
- Axios for API requests

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/mataleogml/its-definitely-a-word.git
   ```

2. Navigate to the project directory:
   ```
   cd its-definitely-a-word
   ```

3. Ensure you have the following files in your project directory:
   - `index.html`
   - `script.js`
   - `dictionary.txt` (a text file containing valid Scrabble words, one per line)
   - `meaning.json` (a JSON file containing word definitions)

4. If you plan to use the GPT-4 API (for Bullshit Mode), you'll need to set up an API key:
   - Sign up for an API key at [OpenAI](https://openai.com/)
   - In the application, go to Settings and enter your API key

## Usage

1. Open `index.html` in a web browser.
2. Enter a word in the search box and click "Search" or press Enter.
3. The application will display whether the word is valid, its Scrabble score, and its definition(s).
4. Click on related words, antonyms, or synonyms to explore further.
5. Use the Settings button to toggle Debug Mode or Bullshit Mode, and to set your GPT-4 API key.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Inspiration

The idea for this project was inspired by Jake Aicher.
