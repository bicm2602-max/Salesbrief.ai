"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

let clarityInitialized = false;

export function MicrosoftClarity() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

    if (process.env.NODE_ENV !== "production" || !projectId || clarityInitialized || document.getElementById("clarity-script")) {
      return;
    }

    Clarity.init(projectId);
    clarityInitialized = true;
  }, []);

  return null;
}
