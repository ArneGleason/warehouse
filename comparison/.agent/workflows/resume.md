---
description: Resume work from a previous session
---

1. Run the session manager to restore the database from the last session.
   ```bash
   node session_manager.js resume
   ```
2. Start the server.
   ```bash
   cd server && node index.js > server.log 2>&1 &
   ```
3. Start the client.
   ```bash
   cd client && npm run dev -- -p 3010 > client.log 2>&1 &
   ```
4. Read the `client.log` or `server.log` if needed to ensure startup.
5. Notify the user that you are ready and summarize the last task based on the output of step 1.
