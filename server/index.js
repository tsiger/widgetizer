// Load .env FIRST — must be before any module that reads process.env
import "./env.js";
import { createEditorApp } from "./createApp.js";

const app = await createEditorApp();

const PORT = process.env.PORT || 3001;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
