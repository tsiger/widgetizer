/**
 * Load .env file into process.env BEFORE any other module reads it.
 * This module must be imported first in the entry point (index.js).
 */
import dotenv from "dotenv";
dotenv.config();
