import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import { TraceShelf } from './TraceShelf';
import './styles.css';

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<TraceShelf />} />
          <Route path="/node/:nodeId" element={<TraceShelf />} />
          <Route
            path="*"
            element={
              <div className="ts-not-found">
                <h1>Страница не найдена</h1>
                <a href="#/">Открыть пространство</a>
              </div>
            }
          />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
);
