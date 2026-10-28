import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Compass,
  GitFork,
  Layers3,
  Mail,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { usePreferences } from './store';
import { useProjects, type Filter, type Project } from './projects';
import { ProjectVisual } from './ProjectVisual';

const navigation = [
  { to: '/#projects', label: 'Проекты' },
  { to: '/#about', label: 'Обо мне' },
  { to: '/#stack', label: 'Стек' },
];

function Header() {
  const { theme, toggleTheme } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuButton = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // A new route remounts the menu, keeping mobile navigation closed after selection.
  const menuVisible = menuOpen;

  useEffect(() => {
    if (!menuVisible) return;
    navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const onClick = (event: PointerEvent) => {
      if (
        !navRef.current?.contains(event.target as Node) &&
        !menuButton.current?.contains(event.target as Node)
      )
        setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onClick);
    };
  }, [menuVisible]);

  return (
    <header className="site-header container">
      <Link to="/" className="brand" aria-label="Портфолио — на главную">
        <span className="brand-mark">
          <Asterisk size={25} strokeWidth={1.8} />
        </span>
        <span>
          portfolio<span className="brand-period">.</span>
        </span>
      </Link>
      <nav
        ref={navRef}
        id="main-navigation"
        className={`main-nav ${menuVisible ? 'is-open' : ''}`}
        aria-label="Основная навигация"
      >
        {navigation.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
            aria-current={
              location.hash === item.to.slice(1) ? 'location' : undefined
            }
          >
            {item.label}
          </Link>
        ))}
        <Link
          to="/#contact"
          className="mobile-contact"
          onClick={() => setMenuOpen(false)}
        >
          Контакты <ArrowUpRight size={15} />
        </Link>
      </nav>
      <div className="header-actions">
        <button
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'
          }
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <Link to="/#contact" className="header-contact">
          На связи <ArrowUpRight size={15} />
        </Link>
        <button
          ref={menuButton}
          className="icon-button menu-toggle"
          aria-label={menuVisible ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuVisible}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen(!menuVisible)}
        >
          {menuVisible ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function HeroArtwork() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-grid" />
      <div className="art-topline">
        <span>
          <span className="tiny-dot" /> CREATIVE DEVELOPMENT
        </span>
        <span>01 — ∞</span>
      </div>
      <div className="orbit-sculpture">
        <svg viewBox="0 0 360 360">
          <defs>
            <radialGradient id="sphere">
              <stop offset="0%" stopColor="#c9e5a9" />
              <stop offset="100%" stopColor="#a4ca85" />
            </radialGradient>
          </defs>
          <circle cx="180" cy="180" r="131" fill="url(#sphere)" />
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse
              key={i}
              cx="180"
              cy="180"
              rx="131"
              ry="46"
              transform={`rotate(${i * 15} 180 180)`}
              fill="none"
              stroke="#496c3e"
              strokeWidth="0.75"
            />
          ))}
          <circle
            cx="180"
            cy="180"
            r="131"
            fill="none"
            stroke="#496c3e"
            strokeWidth="0.75"
          />
        </svg>
      </div>
      <div className="art-floating-label">
        <Braces size={16} />
        <span>Идея встречает код</span>
        <span className="label-dot" />
      </div>
      <div className="code-card">
        <div className="code-card-top">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>interface.tsx</span>
          <Code2 size={12} />
        </div>
        <div className="code-lines">
          <div>
            <em>01</em>
            <span className="code-purple">const</span> experience = {'{'}
          </div>
          <div>
            <em>02</em>
            <span className="code-indent">
              thoughtful: <span className="code-green">true</span>,
            </span>
          </div>
          <div>
            <em>03</em>
            <span className="code-indent">
              human: <span className="code-green">true</span>,
            </span>
          </div>
          <div>
            <em>04</em>
            {'};'} <span className="code-cursor" />
          </div>
        </div>
        <div className="code-status">
          <span className="tiny-dot" /> Меньше шума. Больше смысла.
        </div>
      </div>
      <span className="art-spark spark-one">✳</span>
      <span className="art-spark spark-two">+</span>
      <div className="art-bottomline">
        <span>DESIGN × CODE</span>
        <span>
          СДЕЛАНО С ВНИМАНИЕМ <ArrowUpRight size={13} />
        </span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="tiny-dot" /> FRONTEND DEVELOPER{' '}
          <span className="eyebrow-line" />
        </div>
        <h1 id="hero-heading">
          От идеи —<br />к живому
          <br />
          <span className="hero-emphasis">
            интерфейсу
            <Asterisk />
          </span>
        </h1>
        <p className="hero-description">
          На стыке логики и визуального языка.
          <br />
          React, TypeScript и внимание к деталям.
        </p>
        <div className="hero-buttons">
          <Link className="button button-dark" to="/#projects">
            Смотреть проекты <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" to="/#about">
            Немного обо мне <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-person">
          <div className="person-monogram">
            ИФ
            <span />
          </div>
          <div>
            <span>Имя Фамилия</span>
            <small>Личные данные появятся здесь</small>
          </div>
        </div>
      </div>
      <HeroArtwork />
      <div className="hero-bottom">
        <span>ИНТЕРФЕЙСЫ С ХАРАКТЕРОМ</span>
        <Link to="/#projects">
          Листайте дальше <ArrowDown size={13} />
        </Link>
      </div>
    </section>
  );
}

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все проекты' },
  { id: 'apps', label: 'Приложения' },
  { id: 'experiments', label: 'Эксперименты' },
];

function ProjectPreview({ project }: { project: Project }) {
  return project.status === 'mvp' ? (
    <div className="project-live-preview">
      <img
        src={`${import.meta.env.BASE_URL}projects/traceshelf-preview.png`}
        alt="TraceShelf: рабочий граф источников, утверждений и решений"
        loading="lazy"
      />
      <span>РАБОЧИЙ MVP · ЛОКАЛЬНОЕ ДЕМО</span>
    </div>
  ) : (
    <ProjectVisual kind={project.visual} />
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="project-card group"
      aria-label={`${project.name} — открыть ${project.status === 'mvp' ? 'проект' : 'концепт'}`}
    >
      <div className="project-image">
        <ProjectPreview project={project} />
        <span className="project-open">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="project-meta">
        <span>{project.label}</span>
        <span>
          {project.status === 'mvp' ? 'MVP' : 'КОНЦЕПТ'} {project.number}
        </span>
      </div>
      <h3>
        {project.name}{' '}
        <ArrowUpRight
          size={20}
          className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
        />
      </h3>
      <p>{project.description}</p>
      <div className="project-tags">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </Link>
  );
}

function Projects() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isPending, isError, refetch } = useProjects();
  const visible = data?.filter(
    (project) => filter === 'all' || project.category === filter,
  );
  const filterRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <section
      id="projects"
      className="projects-section container section-anchor"
      aria-labelledby="projects-heading"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <span className="section-index">01 /</span> SELECTED WORK
          </div>
          <h2 id="projects-heading">
            Идеи с продолжением<span className="accent-period">.</span>
          </h2>
        </div>
        <p>
          Рабочие инструменты и будущие идеи.
          <br />В каждом проекте — свой подход.
        </p>
      </div>
      <div className="projects-toolbar">
        <div className="filter-list" role="group" aria-label="Фильтр проектов">
          {filters.map((item, index) => (
            <button
              ref={(element) => {
                filterRefs.current[index] = element;
              }}
              key={item.id}
              className={`filter-button ${filter === item.id ? 'active' : ''}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  filterRefs.current[
                    (index +
                      (event.key === 'ArrowRight' ? 1 : -1) +
                      filters.length) %
                      filters.length
                  ]?.focus();
                }
              }}
            >
              {item.label}
              {item.id === 'all' && data && (
                <span>{data.length.toString().padStart(2, '0')}</span>
              )}
            </button>
          ))}
        </div>
        <span className="projects-note">
          <span className="tiny-dot" /> 1 MVP / 2 КОНЦЕПТА
        </span>
      </div>
      {isPending && (
        <div className="project-grid" aria-label="Загрузка проектов">
          {[1, 2, 3].map((id) => (
            <div className="project-skeleton" key={id} />
          ))}
        </div>
      )}
      {isError && (
        <div className="error-state" role="alert">
          <p>Не удалось загрузить проекты.</p>
          <button className="button button-dark" onClick={() => void refetch()}>
            Попробовать ещё раз <ArrowRight size={16} />
          </button>
        </div>
      )}
      {data && (
        <>
          <p className="sr-only" role="status">
            Показано проектов: {visible?.length}
          </p>
          <div className="project-grid">
            {visible?.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>
        </>
      )}
      <div className="projects-footnote">
        <Asterisk size={16} />
        <span>
          TraceShelf уже работает. QuietSlot и RePair Atlas пока представлены
          концептами.
        </span>
      </div>
    </section>
  );
}

function About() {
  return (
    <section
      id="about"
      className="about-section section-anchor"
      aria-labelledby="about-heading"
    >
      <div className="container about-grid">
        <div className="about-portrait">
          <div className="portrait-grain" />
          <div className="portrait-top">
            <span>THE HUMAN BEHIND THE CODE</span>
            <ArrowUpRight size={17} />
          </div>
          <div className="portrait-glyph">
            <Asterisk strokeWidth={0.7} />
          </div>
          <div className="portrait-bottom">
            <span>
              Место для
              <br />
              <strong>знакомства.</strong>
            </span>
            <span className="portrait-badge">ФОТО СКОРО</span>
          </div>
        </div>
        <div className="about-copy">
          <div className="eyebrow">
            <span className="section-index">02 /</span> ЧЕЛОВЕК ЗА КОДОМ
          </div>
          <h2 id="about-heading">
            Хороший интерфейс
            <br />
            начинается с внимания<span className="accent-period">.</span>
          </h2>
          <p className="about-lead">Здесь будет чуть больше обо мне.</p>
          <p className="about-placeholder">
            Имя, история, опыт и то, что вдохновляет на новые проекты. Пока
            оставлю место для настоящего знакомства — без выдуманных достижений.
          </p>
          <div className="about-details">
            <div>
              <span>Имя</span>
              <strong>
                Имя Фамилия <span className="placeholder-label">заглушка</span>
              </strong>
            </div>
            <div>
              <span>Локация</span>
              <strong>Будет добавлена</strong>
            </div>
            <div>
              <span>Фокус</span>
              <strong>Frontend development</strong>
            </div>
          </div>
          <Link to="/#contact" className="text-link">
            Перейти к контактам <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const stackGroups = [
  {
    icon: Code2,
    index: '01',
    label: 'Основа',
    text: 'Типизированный и компонентный подход.',
    items: ['React', 'TypeScript', 'Vite', 'React Router / Next.js'],
  },
  {
    icon: Layers3,
    index: '02',
    label: 'Данные и состояние',
    text: 'Каждому состоянию — своё место.',
    items: ['React Query', 'Zustand', 'React Hook Form', 'Zod'],
  },
  {
    icon: Compass,
    index: '03',
    label: 'Интерфейс и качество',
    text: 'От первого пикселя до проверки сценария.',
    items: ['Tailwind CSS', 'Figma', 'Vitest', 'Playwright'],
  },
];

function Stack() {
  return (
    <section
      id="stack"
      className="stack-section container section-anchor"
      aria-labelledby="stack-heading"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <span className="section-index">03 /</span> TOOLKIT
          </div>
          <h2 id="stack-heading">
            Меньше случайностей.
            <br />
            Больше системы<span className="accent-period">.</span>
          </h2>
        </div>
        <p>
          Инструменты, из которых
          <br />
          складывается результат.
        </p>
      </div>
      <div className="stack-grid">
        {stackGroups.map(({ icon: Icon, ...group }) => (
          <article className="stack-card" key={group.index}>
            <div className="stack-card-top">
              <Icon size={24} strokeWidth={1.5} />
              <span>{group.index}</span>
            </div>
            <h3>{group.label}</h3>
            <p>{group.text}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item}>
                  <span className="tiny-dot" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="stack-note">
        <Check size={15} /> Стек этого сайта: React + TypeScript + Vite. Next.js
        — для задач, которым нужен сервер.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section
      id="contact"
      className="contact-section container section-anchor"
      aria-labelledby="contact-heading"
    >
      <div className="contact-panel">
        <div className="contact-top">
          <span className="eyebrow">
            <span className="tiny-dot" /> NEXT CHAPTER
          </span>
          <Asterisk size={30} strokeWidth={1.2} />
        </div>
        <div className="contact-content">
          <div>
            <h2 id="contact-heading">
              Хорошие вещи
              <br />
              начинаются с <span>«привет».</span>
            </h2>
            <p>
              Контакты появятся здесь чуть позже.
              <br />А пока — спасибо, что заглянули.
            </p>
          </div>
          <div className="contact-placeholder">
            <div>
              <Mail size={20} />
              <span>Email скоро</span>
              <ArrowUpRight size={19} />
            </div>
            <div>
              <GitFork size={20} />
              <span>GitHub скоро</span>
              <ArrowUpRight size={19} />
            </div>
            <small>КОНТАКТЫ ПОКА НЕ ДОБАВЛЕНЫ</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="container site-footer">
      <Link to="/" className="footer-brand">
        <Asterisk size={20} /> portfolio.
      </Link>
      <span>С вниманием к каждой детали.</span>
      <Link to="/">
        Наверх <ArrowUpRight size={15} />
      </Link>
    </footer>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <Projects />
      <About />
      <Stack />
      <Contact />
    </>
  );
}

function ProjectPage() {
  const { projectId } = useParams();
  const { data, isPending, isError, refetch } = useProjects();
  const project = data?.find((item) => item.id === projectId);

  if (isPending)
    return (
      <div className="container detail-page" role="status">
        Загрузка концепта…
      </div>
    );
  if (isError)
    return (
      <div className="container detail-page error-state" role="alert">
        <p>Не удалось загрузить концепт.</p>
        <button className="button button-dark" onClick={() => void refetch()}>
          Попробовать ещё раз
        </button>
      </div>
    );
  if (!project) return <NotFound />;
  return (
    <article className="container detail-page">
      <Link className="text-link" to="/#projects">
        <ArrowLeft size={17} /> Все проекты
      </Link>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">
            {project.status === 'mvp' ? 'ПРОЕКТ' : 'КОНЦЕПТ'} {project.number} /{' '}
            {project.label}
          </div>
          <h1>
            {project.name}
            <span className="accent-period">.</span>
          </h1>
          <p>{project.description}</p>
        </div>
        <span className="detail-status">
          <span className="tiny-dot" />{' '}
          {project.status === 'mvp' ? 'Рабочий MVP' : 'Ещё не реализован'}
        </span>
      </div>
      {project.demoPath && (
        <div className="detail-demo-links">
          <a
            className="button button-dark"
            href={`${import.meta.env.BASE_URL}${project.demoPath}`}
          >
            Открыть TraceShelf <ArrowUpRight size={17} />
          </a>
          <a
            className="text-link"
            href="https://github.com/sqw1sh/portfolio-site/tree/main/projects/traceshelf/app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Исходный код <ArrowUpRight size={15} />
          </a>
        </div>
      )}
      <ProjectPreview project={project} />
      <div className="detail-grid">
        <div>
          <div className="eyebrow">ОБ ИДЕЕ</div>
          <h2>
            {project.status === 'mvp'
              ? 'У решений есть доказательства.'
              : 'Здесь начнётся история проекта.'}
          </h2>
          <p>{project.idea}</p>
        </div>
        <aside>
          <span className="eyebrow">
            {project.status === 'mvp' ? 'СТЕК ПРОЕКТА' : 'ПЛАНИРУЕМЫЙ СТЕК'}
          </span>
          <div className="project-tags">
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p>
            {project.status === 'mvp'
              ? 'React + TypeScript + Vite, React Router, React Query, Zustand, Tailwind, React Hook Form и Zod. Без сервера и регистрации: данные остаются в браузере. Стартовый набор явно помечен как демонстрационный.'
              : 'Это страница-заглушка. Реализация, скриншоты, ссылки на демо и код будут добавлены после разработки.'}
          </p>
        </aside>
      </div>
      <Link className="button button-dark" to="/#projects">
        К другим проектам <ArrowRight size={17} />
      </Link>
    </article>
  );
}

function NotFound() {
  return (
    <section className="container not-found">
      <span className="eyebrow">404 / НЕ НАШЛОСЬ</span>
      <h1>
        Кажется, этой
        <br />
        страницы ещё нет.
      </h1>
      <p>Возможно, здесь будет следующая идея.</p>
      <Link className="button button-dark" to="/">
        На главную <ChevronRight size={17} />
      </Link>
    </section>
  );
}

export function App() {
  const theme = usePreferences((state) => state.theme);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.title = location.pathname.startsWith('/projects/')
      ? 'Концепт проекта — Портфолио'
      : 'Портфолио — Frontend Developer';
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'start',
      });
      // Keep keyboard focus out of a mobile menu that has just been closed.
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (previousPath.current !== location.pathname)
        mainRef.current?.focus({ preventScroll: true });
    }
    previousPath.current = location.pathname;
  }, [location]);

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <Header key={location.pathname} />
      <main id="main-content" tabIndex={-1} ref={mainRef}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
