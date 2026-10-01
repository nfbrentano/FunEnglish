"use client";

import { Component, type ReactNode } from "react";

/** Keeps a broken activity from taking the whole page down (motor spec, RNF05). */
export class PlayerErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Activity player crashed", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
