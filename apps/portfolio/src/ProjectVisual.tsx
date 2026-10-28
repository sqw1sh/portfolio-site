import {
  ArrowUpRight,
  Check,
  Circle,
  Command,
  Layers3,
  MoveRight,
  Plus,
  Wrench,
} from 'lucide-react';
import type { Project } from './projects';

export function ProjectVisual({ kind }: { kind: Project['visual'] }) {
  return (
    <div className={`project-visual visual-${kind}`} aria-hidden="true">
      <span className="preview-label">КОНЦЕПТ / ЗАГЛУШКА</span>
      {kind === 'graph' && (
        <div className="graph-preview">
          <div className="mock-top">
            <span>
              <Command size={13} /> traceshelf
            </span>
            <span>
              workspace <Plus size={12} />
            </span>
          </div>
          <div className="graph-canvas">
            <svg viewBox="0 0 350 180" preserveAspectRatio="none">
              <path d="M75 45C75 90 175 40 175 90S275 100 275 145M175 90C175 115 65 100 65 145" />
            </svg>
            <span className="graph-node node-source">
              <span className="node-dot" /> Источник <small>research.md</small>
            </span>
            <span className="graph-node node-decision">
              <Layers3 size={12} /> Решение <small>Всё связано</small>
            </span>
            <span className="graph-node node-note">
              <span className="node-dot" /> Гипотеза
            </span>
            <span className="graph-node node-check">
              <Check size={12} /> Проверено
            </span>
          </div>
          <div className="mock-bottom">
            От источника к решению <MoveRight size={12} />
          </div>
        </div>
      )}
      {kind === 'calendar' && (
        <div className="calendar-preview">
          <div className="mock-top">
            <span>
              <Circle size={13} /> quietslot
            </span>
            <span>
              Найти момент <ArrowUpRight size={12} />
            </span>
          </div>
          <div className="calendar-heading">
            Хорошее время.
            <br />
            <span>Для каждого.</span>
          </div>
          <div className="calendar-grid">
            <span />
            {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ'].map((d) => (
              <b key={d}>{d}</b>
            ))}
            {['10:00', '11:00', '12:00'].map((time, row) => (
              <div className="calendar-row" key={time}>
                <small>{time}</small>
                {[0, 1, 2, 3, 4].map((col) => (
                  <i
                    key={col}
                    className={(row + col) % 3 === 0 ? 'slot-active' : ''}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="calendar-pill">
            <span className="tiny-dot" /> Время совпало <Check size={11} />
          </div>
        </div>
      )}
      {kind === 'repair' && (
        <div className="repair-preview">
          <div className="mock-top">
            <span>
              <Wrench size={13} /> RePair Atlas
            </span>
            <span>ПЛАН РЕМОНТА</span>
          </div>
          <div className="repair-body">
            <div className="repair-shape">
              <div className="shape-layer layer-one" />
              <div className="shape-layer layer-two" />
              <div className="shape-layer layer-three" />
              <span>+</span>
            </div>
            <div className="repair-steps">
              <p>
                Собрать.
                <br />
                По порядку.
              </p>
              <span>
                <Check size={12} /> Диагностика
              </span>
              <span>
                <Check size={12} /> Выбор деталей
              </span>
              <span className="current-step">
                <Circle size={12} /> План действий
              </span>
            </div>
          </div>
          <div className="mock-bottom">
            Каждый шаг на своём месте <ArrowUpRight size={12} />
          </div>
        </div>
      )}
    </div>
  );
}
