---
last_updated: 2026-02-10
updated_by: vector-projector
change: "Initial draft — step flow, dependencies, and open UX questions"
tldr: "Linear 5-step workflow with cascading invalidation rules. WIP — answering design questions."
topics: [vector-projector, ux, flow, steps, navigation]
status: draft
type: design
context_cost: 2KB
---

# UX Flow & Step Navigation

Vector Projector uses a linear 5-step workflow. Users progress through steps to build a project, but can navigate backward. Going backward may invalidate downstream work.

## Step Dependency Chain

```
Step 1: STL + Orientation
  └─ Step 2: Extrusion Planes (depend on oriented geometry)
       └─ Step 3: SVGs (placed onto specific planes)
            └─ Step 4: Extrusion Settings (per-shape config)
                 └─ Step 5: Export
```

Each step's output is an input to the next. Changing an upstream step can invalidate everything downstream.

## Invalidation Table

| Action | What it invalidates |
|--------|-------------------|
| Change STL file | Steps 2, 3, 4, 5 (everything) |
| Re-orient STL (lay on face) | Steps 2, 3, 4, 5 (planes change with orientation) |
| Change extrusion planes | Steps 3, 4, 5 (SVGs were placed on old planes) |
| Change SVG placement | Steps 4, 5 |
| Change extrusion settings | Step 5 only |

## Tool Gating

- **Lay on Face**: Only available on Step 1. Auto-deactivates when leaving Step 1.

---

## Open Design Questions

These must be answered before implementation.

### Q1: Forward Gating

Should steps be locked until prerequisites are met?

- **Option A — Hard lock**: Step 2 is disabled until an STL is in the scene. Step 3 disabled until at least one plane is selected. Visual lock icon on tabs.
- **Option B — Soft lock**: Users can browse any tab freely (see the UI, understand what's coming), but can't take actions without prerequisites. Message like "Load an STL in Step 1 first."
- **Option C — No lock**: All tabs always accessible. Users figure it out.

**Decision**: _TBD_

### Q2: Backward Navigation Warnings

When a user goes backward and takes an action that invalidates downstream work:

- **Option A — Warn**: Show a confirmation dialog: "Changing the STL orientation will reset your extrusion planes. Continue?"
- **Option B — Silent wipe**: Just reset downstream data. User discovers it when they navigate forward.
- **Option C — Stale + revalidate**: Keep downstream data but mark it stale. Re-validate when user moves forward. (Complex, may cause confusing states.)

**Decision**: _TBD_

### Q3: Step Indicators

How should step buttons communicate state?

- **Completed**: Checkmark or green indicator?
- **Invalidated**: Warning icon when upstream changes broke this step?
- **Locked**: Grayed out / lock icon when prerequisites not met?
- **Current**: Already highlighted (existing behavior).

**Decision**: _TBD_

### Q4: Auto-Deactivation of Tools

When user leaves Step 1 while Lay on Face is active:

- **Option A — Auto-deactivate**: Lay on Face turns off, overlays disappear, orientation is kept.
- **Option B — Block navigation**: "Deactivate Lay on Face before proceeding."

**Decision**: _TBD_

---

## Decisions Log

_Decisions will be recorded here as they are made._
