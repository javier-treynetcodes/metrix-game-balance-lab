import { AppHeader } from './features/shell/AppHeader';
import { AppFooter } from './features/shell/AppFooter';
import { Welcome } from './features/welcome/Welcome';

export function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader />
      <main id="main" className="app-main">
        <Welcome />
      </main>
      <AppFooter />
    </div>
  );
}
