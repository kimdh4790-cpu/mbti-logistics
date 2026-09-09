---
name: planning-with-files
description: Persists work plans as files so they survive context resets. Use when starting a multi-step task spanning multiple sessions, or when the user says "make a plan" / "let's plan this out".
metadata:
  origin: OthmanAdi/planning-with-files
---

# Planning With Files

Save work plans to disk so they survive context window resets and session restarts.

## When to Activate

- Multi-step task that may span sessions
- User says "plan", "let's plan", "make a plan"
- Complex feature requiring tracking across multiple conversations

## How to Use

### Starting a plan

1. Create `.claude/plans/<task-name>.md` with:
   - Goal (1 sentence)
   - Steps as checkboxes: `- [ ] step description`
   - Current blockers (if any)

2. At start of each session: Read the plan file before doing anything else.

### Plan format

```markdown
# Plan: <task name>
Created: <date>
Status: in-progress | done | blocked

## Goal
<one sentence>

## Steps
- [x] completed step
- [ ] pending step
- [ ] pending step

## Blockers
- (none)

## Notes
- key decisions or context
```

### Updating

- Mark steps done with `[x]` as you complete them
- Add blockers immediately when found
- Commit plan file with code changes (keeps history)

## For This Project

Plans go in: `/home/user/mbti-logistics/.claude/plans/`

Commit plan updates alongside code changes so GitHub history tracks progress.
