import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return <main><small>THE SUPPLY CHAIN GAME LAB</small><h1>Better decisions.<br/>A stronger supply chain.</h1><p>Inventory optimization using repeated and Bayesian game theory.</p></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
