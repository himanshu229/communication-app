import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import './index.css';
import App from './App';

// Add process and Buffer polyfills for browser compatibility
if (typeof global === 'undefined') {
  window.global = window;
}
if (typeof process === 'undefined') {
  window.process = {
    env: {},
    nextTick: function(callback, ...args) {
      setTimeout(() => callback(...args), 0);
    },
    version: '',
    versions: {},
    platform: 'browser',
    title: 'browser',
    browser: true
  };
}
if (typeof Buffer === 'undefined') {
  window.Buffer = {
    from: (data) => new Uint8Array(data),
    isBuffer: () => false,
    alloc: (size) => new Uint8Array(size),
    allocUnsafe: (size) => new Uint8Array(size)
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);