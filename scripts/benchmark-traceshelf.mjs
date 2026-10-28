import {
  createDemo,
  getHealth,
  todayISO,
  validateWorkspace,
} from '../projects/traceshelf/app/src/model.ts';

const template = createDemo().nodes[0];
const ids = Array.from(
  { length: 200 },
  (_, index) =>
    `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
);
const data = validateWorkspace({
  schemaVersion: 1,
  demo: true,
  nodes: ids.map((id, index) => ({
    ...template,
    id,
    kind: index === 0 ? 'source' : 'claim',
    title: `Bench ${index}`,
    body: '',
    owner: 'Benchmark',
    checkedAt: todayISO(),
    reviewedVersions: Object.fromEntries(
      ids.slice(0, index).map((key) => [key, 1]),
    ),
  })),
  edges: ids.slice(1).map((id, index) => ({ from: ids[index], to: id })),
});
for (let index = 0; index < 3; index++) getHealth(data);
const durations = [];
for (let index = 0; index < 10; index++) {
  const start = performance.now();
  if (getHealth(data).size !== 200) throw new Error('Invalid benchmark result');
  durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      nodes: 200,
      edges: 199,
      scenario: 'chain',
      warmups: 3,
      runs: 10,
      medianMs: +((durations[4] + durations[5]) / 2).toFixed(2),
      minMs: +durations[0].toFixed(2),
      maxMs: +durations.at(-1).toFixed(2),
      node: process.version,
    },
    null,
    2,
  ),
);
