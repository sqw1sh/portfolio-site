import { demoWorkspace, workspaceSchema } from './model';

export async function loadDemos() {
  return [
    {
      name: 'Атлантика',
      description: 'Москва · Лондон · Нью-Йорк',
      data: workspaceSchema.parse(demoWorkspace()),
    },
    {
      name: 'Тихий океан',
      description: 'Лос-Анджелес · Токио · Сидней',
      data: workspaceSchema.parse(demoWorkspace(true)),
    },
  ];
}
