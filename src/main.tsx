import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TabletGate } from './components/TabletGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TabletGate>
      <App />
    </TabletGate>
  </React.StrictMode>
);
