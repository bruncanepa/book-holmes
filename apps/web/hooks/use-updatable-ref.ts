import { useRef, useState } from "react";

export const useUpdatableRef = <T>(initialValue: T) => {
  const ref = useRef<T>(initialValue);
  const [, setState] = useState(0);
  return {
    current: ref.current,
    update: (value: T) => {
      ref.current = value;
      setState((s) => s + 1);
    },
  };
};
