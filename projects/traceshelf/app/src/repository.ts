import { createDemo, validateWorkspace, type Workspace } from './model';

export const STORAGE_KEY = 'traceshelf.workspace.v1';

export function readWorkspace(): Workspace {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      'Браузер запретил доступ к локальному хранилищу. Разрешите сохранение данных для этого сайта.',
    );
  }
  if (raw === null) {
    const data = createDemo();
    writeWorkspace(data);
    return data;
  }
  try {
    return validateWorkspace(JSON.parse(raw));
  } catch {
    throw new Error(
      'Сохранённые данные повреждены или не соответствуют схеме v1. Можно скачать исходный JSON, затем восстановить демо.',
    );
  }
}

export function writeWorkspace(input: Workspace): Workspace {
  const data = validateWorkspace(input);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      'Не удалось сохранить данные в браузере. Проверьте доступ к хранилищу или освободите место. Текущее состояние не изменено.',
    );
  }
  return data;
}

export function updateWorkspace(
  update: (current: Workspace) => Workspace,
): Workspace {
  return writeWorkspace(update(readWorkspace()));
}

export function importWorkspace(text: string): Workspace {
  if (new TextEncoder().encode(text).byteLength > 1_048_576)
    throw new Error('Файл слишком большой: максимум 1 МБ.');
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('Файл не является корректным JSON.');
  }
  // Validate everything before a single atomic localStorage write.
  return writeWorkspace(validateWorkspace(input));
}

export function downloadJSON(
  text: string,
  filename = 'traceshelf-workspace.json',
) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
