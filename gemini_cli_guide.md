# Antigravity CLI (`agy`) — Complete Usage & Workflow Guide

**Antigravity CLI (`agy`)** is the official terminal client for **Google AI Pro** and **Google AI Ultra** subscribers. It acts as an agentic pair-programmer directly inside your workspace—capable of reading repositories, planning multi-file changes, editing code, executing shell commands, and connecting to external tools via the Model Context Protocol (MCP).

---

## 1. Quick Start & Session Launch

Launch `agy` from the root of your project repository so it has full visibility into your Git history, directory layout, and project configuration files.

| Command | Description |
| :--- | :--- |
| `agy` | Start an interactive session in the current directory. |
| `agy -c` | Continue the most recent session in the current directory. |
| `agy -p "prompt"` | **Headless / non-interactive mode:** Run a single prompt, print the response, and exit. |
| `agy -p "..." --output-format json` | Output structured JSON for shell scripts and CI pipelines. |
| `agy --model <name>` | Launch with a specific model (e.g., `gemini-4-neon`, `gemini-4-carbon`). |
| `agy models` | List all models and reasoning tiers available on your subscription. |

### Piping Input into `agy`
You can pipe command outputs, logs, or diffs directly into headless mode:
```bash
git diff main...HEAD | agy -p "Review this diff for race conditions, edge cases, and security issues"
go test ./... 2>&1 | agy -p "Diagnose these test failures and propose a fix"
```

---

## 2. The Four Input Prefixes

Inside an active interactive session, the first character of your prompt controls how `agy` processes your input:

* **Plain Text (Agent Mode):** Sends a request to the model to analyze code, plan steps, edit files, or run tools.
* **`@path/to/file` or `@dir/` (Context Injection):** Explicitly attaches specific files or directories into your prompt so the model reads them immediately without wasting turns searching.
  * *Example:* `@backend/ws/hub.go @schemas/telemetry.fbs Explain why client disconnects cause a panic here.`
* **`!command` (Shell Passthrough):** Runs a shell command directly on your host machine and injects both the command and its `stdout`/`stderr` into the conversation context.
  * *Example:* `!git status` or `!npm run build`
  * Typing `!` on a line by itself toggles persistent shell mode until you exit it.
* **`/` (CLI Control Commands):** Executes local CLI commands without sending a prompt to the model.

---

## 3. Essential Slash Commands (`/`)

| Command | Purpose & Best Practice |
| :--- | :--- |
| **`/plan`** | **Switches to read-only Plan Mode.** The agent explores the codebase, asks clarifying questions, and drafts a step-by-step implementation plan before modifying any files. *Always use this before multi-file refactors or schema changes.* |
| **`/model`** | Opens an interactive selector to switch between models and reasoning depths (`low`, `medium`, `high`) mid-session. Use faster models for boilerplate/tests and high-reasoning models for architecture and debugging. |
| **`/rewind` or `/undo`** | Steps backward through conversation turns and automatically reverts file edits made during those turns. |
| **`/resume`** | Lists saved sessions in the current workspace so you can reload a previous conversation. |
| **`/clear`** | Clears the current conversation history and resets context. Run this between unrelated tasks to keep responses fast and accurate. |
| **`/fork`** | Clones the current conversation into a parallel branch so you can test an alternative implementation without losing your current state. |
| **`/compact`** | Summarizes older turns in a long session to free up context window space while preserving key decisions and file references. |
| **`/usage`** | Displays current session token usage and subscription quota status. |
| **`/mcp`** | Lists connected Model Context Protocol servers, their connection health, and exposed tools. |
| **`/help` or `?`** | Displays all available slash commands and keyboard shortcuts. |

---

## 4. Execution & Approval Modes

By default, `agy` operates safely: it shows a unified diff before writing to files and asks for confirmation before running shell commands. You can adjust this behavior with `--mode`:

1. **Default (`agy`):** Prompts for approval on every file edit and shell command. Recommended for exploratory work and production repositories.
2. **Auto-Edit (`agy --mode accept-edits`):** Automatically applies file edits inside your project directory, while still pausing to ask permission before executing shell commands. Ideal once you have reviewed and approved a `/plan`.
3. **Full Auto (`agy --dangerously-skip-permissions`):** Executes all file edits and shell commands without confirmation prompts. **Only use this inside an isolated Git branch, container, or sandbox.**

---

## 5. Persistent Project Configuration (`GEMINI.md`)

At startup, `agy` automatically searches for and loads `GEMINI.md` (or `AGENTS.md`) from your repository root (and `~/.gemini/GEMINI.md` for global user preferences).

Use `GEMINI.md` to establish permanent project rules so you never have to repeat them across sessions:

```markdown
# Project Rules & Context

## Stack & Commands
- Backend: Go 1.24 + PostgreSQL (`spacetactics`)
- Frontend: React, TypeScript, Pixi.js
- Run backend tests: `go test ./...`
- Run frontend typecheck: `npm run typecheck`

## Architecture & Conventions
- All WebSocket game state packets must use FlatBuffers schemas located in `/schemas`.
- Never hardcode unit stats or balance parameters; query them from PostgreSQL on startup.
- Keep functions small, prefer explicit error handling in Go, and avoid third-party dependencies unless approved.
```

> **Best Practice:** Keep `GEMINI.md` concise and high-signal (under ~150 lines). Anything in this file is injected into the system context of every prompt.

---

## 6. Model Context Protocol (MCP) Integration

`agy` supports MCP servers so the agent can query databases, inspect API specs, or interact with local developer tools directly.

* **Global MCP config:** `~/.gemini/config/mcp_config.json`
* **Project-scoped MCP config:** `.agents/mcp_config.json`

Example configuration for connecting a local PostgreSQL or filesystem MCP server:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/mydb"]
    }
  }
}
```
Once configured, run `/mcp` inside a session to verify that the server's tools are active.

---

## 7. High-Leverage Daily Workflow

1. **Start from a clean Git state:** Commit or stash local edits before starting an agent session. This ensures `git diff` and `git checkout` give you a clean safety net.
2. **Anchor prompts with `@` references:** Instead of saying *"fix the login bug,"* say *"@auth/handler.go @auth/session_test.go the JWT refresh fails when tokens expire within 5 seconds."*
3. **Plan first, execute second:** For any change touching 3+ files, enter `/plan`, review the proposed file list and edge cases, refine the plan, and then switch to `--mode accept-edits` (or approve edits as they run).
4. **Verify with `!` shell commands:** Have the agent run your test suite or linter (`!go test ./...` or `!npm test`) after applying edits so it can self-correct compiler or test errors immediately.
5. **Scope one task per session:** When a feature is tested and committed, run `/clear` before moving to the next task so stale context doesn't degrade reasoning quality.