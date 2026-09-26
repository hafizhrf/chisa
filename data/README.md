# Phoebe Portfolio Database Export

This directory contains the exported SQLite database, SQL dumps, and JSON representations from the **Phoebe** portfolio project (`apps/api/data/sprout.db`).

## Contents

- **`portfolio.db`**: Vacuumed, clean SQLite 3 database file.
- **`schema.sql`**: SQL schema definition (DDL) for all tables.
- **`dump.sql`**: Full database dump (DDL + INSERT statements).
- **`portfolio.json`**: Structured JSON export of all tables (projects, experiences, skills, site_content, guestbook, events).
- **`uploads/`**: Media assets referenced by projects (thumbnails and gallery screenshots).

## Tables Overview

- **`projects`**: Project titles, descriptions, tech tags, URLs, thumbnail, and screenshots.
- **`experiences`**: Professional experience and roles.
- **`skills`**: Technical skills with category, level, and icon names.
- **`site_content`**: Key-value content (e.g. `hero`, `about`, bio, social links).
- **`guestbook`**: Guestbook entries.
- **`contacts`**: Contact submissions.
- **`events`**: Activity / analytics events.
