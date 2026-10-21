import { useEffect, useRef } from "react";

export const COMMIT_DELAY_MS = 50;

export function useDebouncedCommit<T>(
  value: T,
  commit: (value: T) => void,
  delayMs: number = COMMIT_DELAY_MS,
): void {
  const valueKey = JSON.stringify(value);
  const committedKeyRef = useRef(valueKey);
  const valueRef = useRef(value);
  const commitRef = useRef(commit);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  useEffect(() => {
    if (valueKey === committedKeyRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      committedKeyRef.current = valueKey;
      commitRef.current(valueRef.current);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [valueKey, delayMs]);
}
