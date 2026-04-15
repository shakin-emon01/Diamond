"use client";

import { useEffect } from "react";

const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"]);
const SCROLL_TOLERANCE = 1;

function canScrollAxis(
  element: HTMLElement,
  delta: number,
  axis: "x" | "y"
) {
  if (delta === 0) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const overflowValue = axis === "y" ? style.overflowY : style.overflowX;
  const isTextarea = axis === "y" && element instanceof HTMLTextAreaElement;
  const isScrollable = isTextarea || SCROLLABLE_OVERFLOW_VALUES.has(overflowValue);

  if (!isScrollable) {
    return false;
  }

  const scrollPosition = axis === "y" ? element.scrollTop : element.scrollLeft;
  const scrollSize = axis === "y" ? element.scrollHeight : element.scrollWidth;
  const clientSize = axis === "y" ? element.clientHeight : element.clientWidth;
  const maxScroll = scrollSize - clientSize;

  if (maxScroll <= SCROLL_TOLERANCE) {
    return false;
  }

  if (delta < 0) {
    return scrollPosition > SCROLL_TOLERANCE;
  }

  return scrollPosition < maxScroll - SCROLL_TOLERANCE;
}

function canScrollWithinBoundary(
  target: HTMLElement,
  boundary: HTMLElement,
  deltaX: number,
  deltaY: number
) {
  let current: HTMLElement | null = target;

  while (current) {
    if (canScrollAxis(current, deltaY, "y") || canScrollAxis(current, deltaX, "x")) {
      return true;
    }

    if (current === boundary) {
      break;
    }

    current = current.parentElement;
  }

  return false;
}

export function useWheelScrollRelay(rootSelector = "[data-wheel-relay-root]") {
  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (event.defaultPrevented || event.ctrlKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const boundary = target.closest(rootSelector);
      if (!(boundary instanceof HTMLElement)) {
        return;
      }

      if (canScrollWithinBoundary(target, boundary, event.deltaX, event.deltaY)) {
        return;
      }

      event.preventDefault();
      window.scrollBy({
        top: event.deltaY,
        left: event.deltaX,
        behavior: "auto"
      });
    }

    document.addEventListener("wheel", onWheel, { capture: true, passive: false });

    return () => {
      document.removeEventListener("wheel", onWheel, true);
    };
  }, [rootSelector]);
}
