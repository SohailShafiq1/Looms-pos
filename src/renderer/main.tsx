import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	document.body.innerHTML = '<h1 style="padding: 32px; font-family: sans-serif">Loom POS: root element not found</h1>';
} else {
	try {
		createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		rootElement.innerHTML = `<h1 style="padding: 32px; font-family: sans-serif">Loom POS failed to start</h1><pre style="padding: 32px; white-space: pre-wrap">${message}</pre>`;
		console.error('Renderer failed to start:', error);
	}
}
 