// Server-safe: the root layout inlines this script in <head>.
export const STUDENT_MODE_PARAM = "mode";
export const STUDENT_MODE_VALUE = "student";

/** Hides the site chrome before the first paint on `?mode=student` links. */
export const studentModeInitScript = `(function(){try{if(new URLSearchParams(location.search).get(${JSON.stringify(
  STUDENT_MODE_PARAM,
)})===${JSON.stringify(STUDENT_MODE_VALUE)})document.documentElement.dataset.mode="student";}catch(e){}})();`;
