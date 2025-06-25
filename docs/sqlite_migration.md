# SQLite Integration Plan (Final)

This document outlines a minimal, focused plan for integrating SQLite into the application, following a detailed re-evaluation of its benefits.

## Core Principles

This plan adheres to the following strict principles:

1.  **File-Based Architecture is Primary**: The application's core architecture remains file-based. Projects, pages, menus, global settings, and export history will continue to be stored and managed as files on the filesystem. The database is **not** a replacement for this system.
2.  **Database for a Single, Specific Purpose**: SQLite will be used **exclusively to enhance the Media Library**. This is the one area where the performance and data integrity benefits of a database provide a clear advantage over a JSON file, even for small websites.

This targeted approach solves a specific performance bottleneck (media searching/filtering) and improves data integrity (usage tracking) without introducing unnecessary complexity to the rest of the application.

---

## Proposed Database Schema

The database will contain **only two tables** related to the media library:

### 1. `media`

Stores metadata for all uploaded files across all projects, replacing the individual `media.json` files. This allows for fast, centralized searching and management in the UI. The physical files remain on the filesystem.

| Column            | Type    | Constraints                       | Description                                        |
| :---------------- | :------ | :-------------------------------- | :------------------------------------------------- |
| `id`              | TEXT    | PRIMARY KEY                       | A stable, system-generated unique ID (UUID).       |
| `project_id`      | TEXT    | NOT NULL                          | The ID of the project this media belongs to.       |
| `filename`        | TEXT    | NOT NULL                          | The unique filename on disk.                       |
| `original_name`   | TEXT    | NOT NULL                          |                                                    |
| `mime_type`       | TEXT    | NOT NULL                          |                                                    |
| `size`            | INTEGER | NOT NULL                          | Size in bytes.                                     |
| `width`           | INTEGER |                                   |                                                    |
| `height`          | INTEGER |                                   |                                                    |
| `alt_text`        | TEXT    |                                   |                                                    |
| `caption`         | TEXT    |                                   |                                                    |
| `generated_sizes` | JSON    |                                   | An object storing paths for `thumb`, `small`, etc. |
| `created_at`      | TEXT    | NOT NULL                          |                                                    |
| _Composite_       |         | UNIQUE (`project_id`, `filename`) |                                                    |

### 2. `media_usage`

A dedicated table to efficiently track where media is used, replacing the `usedIn` array within `media.json`. This provides robust protection against deleting a file that is currently in use.

| Column | Type | Constraints | Description |
| :-- | :-- | :-- | :-- |
| `media_id` | TEXT | NOT NULL, FOREIGN KEY -> `media.id` |  |
| `usage_location_id` | TEXT | NOT NULL | The ID of the page/widget using the media. |
| `usage_location_type` | TEXT | NOT NULL | e.g., `page`, `widget`. |
| _Composite_ |  | PRIMARY KEY (`media_id`, `usage_location_id`) |  |
