import { create } from 'zustand';
import type { Kind, Status } from './model';

export const useWorkspaceUI = create<{
  view: 'graph' | 'table';
  search: string;
  kind: Kind | 'all';
  status: Status | 'all';
  owner: string;
  zoom: number;
  set: (
    patch: Partial<{
      view: 'graph' | 'table';
      search: string;
      kind: Kind | 'all';
      status: Status | 'all';
      owner: string;
      zoom: number;
    }>,
  ) => void;
  reset: () => void;
}>((set) => ({
  view: 'graph',
  search: '',
  kind: 'all',
  status: 'all',
  owner: '',
  zoom: 1,
  set,
  reset: () => set({ search: '', kind: 'all', status: 'all', owner: '' }),
}));
