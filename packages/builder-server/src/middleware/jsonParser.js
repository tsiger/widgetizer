import express from "express";

/** Standard JSON body parser for most API routes (2 MB). */
export const standardJsonParser = express.json({ limit: "2mb" });

/** Higher-limit JSON body parser for page content save (10 MB). */
export const editorJsonParser = express.json({ limit: "10mb" });
