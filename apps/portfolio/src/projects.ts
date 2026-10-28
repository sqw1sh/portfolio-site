import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const projectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  number: z.string(),
  name: z.string(),
  category: z.enum(['apps', 'experiments']),
  label: z.string(),
  description: z.string(),
  idea: z.string(),
  caseHeading: z.string().optional(),
  tags: z.array(z.string()),
  visual: z.enum(['graph', 'calendar', 'repair']),
  status: z.enum(['concept', 'mvp']).default('concept'),
  demoPath: z
    .string()
    .regex(/^[a-z0-9-]+\/$/)
    .optional(),
});

export type Project = z.infer<typeof projectSchema>;
export type Filter = 'all' | Project['category'];

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}content/projects.json`,
        { signal },
      );
      if (!response.ok) throw new Error('Не удалось загрузить проекты');
      return z.array(projectSchema).parse(await response.json());
    },
  });
}
