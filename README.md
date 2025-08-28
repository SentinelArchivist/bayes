# Bayes — Bayesian Reasoning App

A simple, offline-capable Progressive Web App for Bayesian reasoning with multiple hypotheses, repeated updates, and Jeffrey conditionalization.

## Features

- **Hypothesis Management**: Add, edit, remove, and reorder hypotheses with priors
- **Evidence Updates**: Support for certain evidence and uncertain evidence (Jeffrey conditionalization)  
- **Visualization**: Interactive charts showing current posteriors and belief evolution over time
- **Offline First**: Full functionality without internet connection using IndexedDB
- **PWA Support**: Install on iPhone and Mac, works like a native app
- **Import/Export**: Save and share projects as JSON files
- **Numerical Stability**: Log-space calculations prevent underflow/overflow
- **Comprehensive Testing**: Full test suite for algorithms and functionality

## Quick Start

1. Open the app in a modern web browser
2. Add your hypotheses and set initial priors (supports decimals, percentages, fractions, scientific notation)
3. Navigate to Evidence tab to add observations
4. View updated beliefs in Results tab with interactive charts
5. Track your reasoning process in History tab with undo/redo

## Usage Examples

### Medical Diagnosis
- **Hypotheses**: "Has Disease", "Healthy"  
- **Priors**: Based on base rate (e.g., 1%, 99%)
- **Evidence**: Test results with known sensitivity/specificity

### Forecasting
- **Hypotheses**: Different market scenarios
- **Priors**: Historical frequencies or expert judgment
- **Evidence**: New economic indicators

## Technical Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (ES6 modules)
- **Storage**: IndexedDB for offline-first data persistence
- **Charts**: Custom SVG-based visualization with performance optimization
- **PWA**: Service Worker for offline caching and app-like experience
- **Algorithms**: Numerically stable Bayesian updates with log-space calculations

## Development

Run a local server:
```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`

### Testing

- **Integration Tests**: `/test_app.html` - Browser-based comprehensive testing
- **Algorithm Tests**: `/tests/test_runner.html` - Core algorithm validation
- **Manual Testing**: Use the app with various scenarios

### PWA Installation

On iPhone:
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"

On Mac:
1. Open in Chrome/Safari
2. Look for install prompt or use browser menu

## Architecture

### Core Modules

- `js/algorithms.js` - Bayesian update calculations with numerical stability
- `js/storage.js` - IndexedDB wrapper for offline data persistence  
- `js/charts.js` - SVG-based visualization components
- `js/app.js` - Main application controller and UI logic
- `js/main.js` - Application entry point and initialization

### Data Model

Projects contain:
- **Hypotheses**: Label, prior probability, optional color
- **History**: Sequence of evidence updates with timestamps
- **Timeline**: Posterior probabilities after each update
- **Settings**: Display preferences and formatting options

## Security & Privacy

- **Local-First**: No data leaves device without explicit export
- **Content Security Policy**: Prevents XSS attacks
- **Input Validation**: Comprehensive validation of all user inputs
- **No External Dependencies**: Fully self-contained for security and offline use

## Browser Compatibility

- Chrome 80+
- Safari 13+
- Firefox 75+
- Edge 80+

Requires ES6 module support and IndexedDB.

## License

MIT License
