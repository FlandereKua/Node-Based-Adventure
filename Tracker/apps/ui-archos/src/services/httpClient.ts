import { parse } from 'yaml';

export const fetchYaml = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  const text = await response.text();
  return parse(text) as T;
};
