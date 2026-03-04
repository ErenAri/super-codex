# Prompt Quality Checklist

Use this checklist when editing files in `content/commands/*.md`.

## Structure

- Title uses canonical command name: `# /supercodex:<command>`
- Required sections exist with emoji headers:
  - `## 🎯 Purpose`
  - `## 🚀 Activation`
  - `## 🧠 Behavioral Flow`
  - `## 🔌 MCP Integration`
  - `## 🧱 Boundaries`
  - `## 🧾 Output Format`
  - `## 🧪 Edge Cases`
  - `## 🛠️ Recovery Behavior`
  - `## ✅ Next Steps`
  - `## 📥 User Task`

## Quality Rules

- Behavioral phases are explicit and ordered.
- Boundary sections clearly distinguish allowed vs disallowed behavior.
- Output format section includes a concrete template and formatting rules.
- Edge cases and recovery behavior are actionable.
- Language is concise, specific, and free of filler.

## Naming and Compatibility

- Canonical naming is `/supercodex:*`.
- Do not use `/sc:*` as primary naming in command prompts.
- If shorthand is mentioned, label it as compatibility syntax.

## Verification

- Run `npm run build`
- Run `npm test`
- Ensure `tests/commands.test.ts` passes heading and naming assertions.
