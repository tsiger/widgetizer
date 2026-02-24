import express from "express";
import { EDITOR_LIMITS } from "../limits.js";

/** Standard JSON body parser for most API routes (2 MB). */
export const standardJsonParser = express.json({ limit: EDITOR_LIMITS.jsonBodyLimit });

/** Higher-limit JSON body parser for page content save (10 MB). */
export const editorJsonParser = express.json({ limit: EDITOR_LIMITS.editorJsonBodyLimit });
