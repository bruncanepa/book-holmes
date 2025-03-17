import { useRef, RefObject } from "react";
import { useForceUpdate } from "./use-force-update";

export const useUpdatableRef = <T>(
  initialValue: T
): [RefObject<T>, (v: T) => any] => {
  const forceUpdate = useForceUpdate();
  const ref = useRef<T>(initialValue);

  const updateRef = (val: T) => {
    ref.current = val;
    forceUpdate();
  };

  return [ref, updateRef];
};
