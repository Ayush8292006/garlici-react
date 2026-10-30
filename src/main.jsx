import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { connect } from './lib/store.js';
import './styles.css';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
connect();
