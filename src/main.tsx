import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './css/app.css';
import Metrix from './Metrix';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Metrix />
  </React.StrictMode>
);
