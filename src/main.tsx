import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TabletGate } from './components/TabletGate';
import { StoreProtectionGate } from './components/StoreProtectionGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TabletGate>
      <StoreProtectionGate>
        <App />
      </StoreProtectionGate>
    </TabletGate>
  </React.StrictMode>
);
