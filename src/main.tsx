import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/instrument-sans/standard.css';
import App from './App';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import './visual.css';

const root = document.getElementById('root');
if (!root) throw new Error('Helios root element is missing');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
