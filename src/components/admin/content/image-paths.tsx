"use client";

import { createContext } from "react";

/** Images that exist in public/images (known at build time), for the picker (RF04). */
export const ImagePathsContext = createContext<string[]>([]);
