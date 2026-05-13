---
description: Read-only agent for external docs and dependency research. Inspects library source, cross-references local code against upstream implementations.
mode: subagent
model: opencode-go/deepseek-v4-flash
color: "#009688"
permission:
  edit: deny
  bash: ask
  skill:
    "*": deny
---
