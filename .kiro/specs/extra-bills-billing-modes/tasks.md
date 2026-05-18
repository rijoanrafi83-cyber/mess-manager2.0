# Implementation Plan: Extra Bills Billing Modes

## Overview

This plan implements the Extra Bills billing modes feature incrementally, starting with core data models and calculation logic, then building UI components, and finally wiring everything together with reports and carry-forward. The approach preserves existing billing behavior by first extracting extra costs from the meal rate calculation, then layering in the new per-member share logic.

## Tasks

- [ ] 1. Set up project structure and core constants
  - [ ] 1.1 Create extra-bills directory and define category constants
    - Create `src/components/extra-bills/` directory
    - Create `src/utils/extraBillConstants.js` with `EXTRA_BILL_CATEGORIES` array and `BILLING_MODES` enum
    - Export helper functions: `normalizeLegacyBill(bill, activeMembers)` that fills in default fields for legacy documents
    - _Requirements: 14.1, 14.5, 12.1_

  - [ ] 1.2 Set up Vitest and fast-check testing framework
    - Install `vitest` and `fast-check` as dev dependencies
    - Create `vitest.config.js` with appropriate settings for the Vite project
    - Create `src/utils/__tests__/` directory for billing tests
    - Add `"test": "vitest --run"` script to package.json
    - _Requirements: (testing infrastructure)_

- [ ] 2. Implement billing calculation logic
  - [ ] 2.1 Refactor `calculateMonthlyBill` to separate extra costs from meal rate
    - Modify `src/utils/billing.js` to remove `totalExtra` from `grandExpense` calculation
    - `grandExpense` should now equal `totalBazaar` only (bazaar drives meal rate)
    - Add `computeExtraBillShares(extraCosts, members)` helper function that returns a map of memberId → { extraBillsTotal, extraBillsBreakdown }
    - For each extra bill: normalize legacy docs (no `billingMode` → treat as `total_shared` with all active members), then compute `memberShare` based on billing mode
    - Merge extra bill shares into each member's bill object: add `extraBillsTotal` and `extraBillsBreakdown` fields
    - Update member `total` to equal `mealCost + extraBillsTotal`
    - Update member `due` to equal `total - deposit`
    - Update member `balance` to equal `deposit - total`
    - Preserve all existing return fields (`totalBazaar`, `totalExtra`, `grandExpense`, `totalMeals`, `totalDeposits`, `totalDue`, `mealRate`, `totalGuestMeals`)
    - **Critical**: Ensure `mealRate = totalBazaar / totalMeals` (no longer includes extra costs)
    - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.3, 7.1, 7.2, 12.1, 12.2, 15.3, 15.4, 15.5_

  - [ ] 2.2 Create input validation utility
    - Create `src/utils/extraBillValidation.js`
    - Implement `validateExtraBill({ title, amount, selectedMemberIds })` that returns `{ valid: boolean, errors: { title?: string, amount?: string, members?: string } }`
    - Title: reject empty or whitespace-only strings → "Bill title is required"
    - Amount: reject zero, negative, NaN, Infinity → "Amount must be a positive number"
    - Members: reject empty array → "At least one member must be selected"
    - _Requirements: 5.2, 5.3, 2.4_

  - [ ]* 2.3 Write property test: Total Shared Bill division
    - Create `src/utils/__tests__/billing.property.test.js`
    - **Property 1: Total Shared Bill division**
    - Generate random positive amounts (0.01–999999) and random non-empty member ID arrays (1–50 members)
    - Verify `memberShare = Math.round((amount / count) * 100) / 100` and result has ≤2 decimal places
    - **Validates: Requirements 3.1, 3.3, 3.4**

  - [ ]* 2.4 Write property test: Per Member Unit Bill multiplication
    - **Property 2: Per Member Unit Bill multiplication**
    - Generate random positive amounts and random non-empty member ID arrays
    - Verify `totalAmount = amount * count` and `memberShare = amount`
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 2.5 Write property test: Member inclusion/exclusion in billing
    - **Property 3: Member inclusion/exclusion in billing**
    - Generate random members and random extra bills with varying `selectedMemberIds`
    - Run `calculateMonthlyBill`, verify each member's `extraBillsTotal` only includes shares from bills they're selected in
    - **Validates: Requirements 7.1, 7.2, 15.4, 15.5**

  - [ ]* 2.6 Write property test: Legacy document backward compatibility
    - **Property 4: Legacy document backward compatibility**
    - Generate random extra bill documents without `billingMode` field
    - Run through calculator with random active members
    - Verify result matches `amount / activeMembers.length` per member
    - **Validates: Requirements 12.1, 12.2**

  - [ ]* 2.7 Write property test: Final total composition
    - **Property 6: Final total composition**
    - Generate random complete billing scenarios (members, meals, bazaar, deposits, extra bills)
    - Run `calculateMonthlyBill`, verify each member's `total = mealCost + extraBillsTotal`
    - **Validates: Requirements 15.3**

  - [ ]* 2.8 Write property test: Input validation rejects invalid data
    - **Property 7: Input validation rejects invalid data**
    - Generate random invalid amounts (≤0, NaN, Infinity) and invalid titles (empty, whitespace-only), verify rejection
    - Generate valid amounts and titles, verify acceptance
    - **Validates: Requirements 5.2, 5.3**

- [ ] 3. Checkpoint - Core calculation logic
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Firestore service layer
  - [ ] 4.1 Add extra bill CRUD operations to firestoreService
    - Enhance `addExtraCost` in `src/services/firestoreService.js` to accept full payload: `{ ownerId, title, billingMode, amount, totalAmount, selectedMemberIds, memberShare, date, category, isRecurring, createdAt }`
    - Add `updateExtraCost(id, data)` function that updates a document preserving `createdAt`
    - Add `deleteExtraCost(id)` function
    - Add `carryForwardRecurringBills(ownerId, bills, targetDate)` function that creates new documents for the target month using `writeBatch`
    - Add `toggleRecurring(id, isRecurring)` function to enable/disable recurrence
    - _Requirements: 5.1, 5.4, 5.5, 6.2, 6.3, 8.2, 8.3, 13.3_

- [ ] 5. Implement UI components
  - [ ] 5.1 Create MemberSelector component
    - Create `src/components/extra-bills/MemberSelector.jsx`
    - Render scrollable checkbox list of active members
    - Include "Select All" / "Deselect All" toggle button
    - Display count: "X of Y members selected"
    - Call `onChange(selectedIds)` on every toggle
    - Use existing UI primitives (checkbox styling consistent with app theme)
    - Ensure scrollable on mobile when member count exceeds visible area
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 11.4_

  - [ ] 5.2 Create BillForm modal component
    - Create `src/components/extra-bills/BillForm.jsx`
    - Billing mode selector: radio buttons for "Total Shared Bill" and "Per Member Unit Bill", default to "Total Shared Bill"
    - Title input field with validation error display
    - Amount input field with dynamic label ("Total Amount" vs "Amount Per Member") based on mode
    - Real-time calculation display: show "Per Member: ৳X" for total_shared, "Total: ৳X" for per_member_unit
    - Category dropdown with predefined options from constants, default "Other"
    - MemberSelector integration with pre-selected all active members on create
    - "Recurring Monthly" toggle switch
    - Edit mode: populate all fields from `editBill` prop
    - Clear amount when billing mode switches
    - Form validation before submit using `validateExtraBill`
    - Call `addExtraCost` or `updateExtraCost` on submit, show toast on success/failure
    - Use existing Modal, Button, Input components from UI library
    - Glassmorphism theme tokens applied
    - Responsive layout (320px–1920px)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.2, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 8.1, 8.2, 11.1, 11.2, 11.3, 11.5, 14.1, 14.2_

  - [ ] 5.3 Create DeleteConfirmModal component
    - Create `src/components/extra-bills/DeleteConfirmModal.jsx`
    - Standard confirmation for non-recurring bills: "Delete [title]? This action cannot be undone."
    - Enhanced warning for recurring bills: "This is a recurring bill. Deleting it will also stop future monthly carry-forwards. Are you sure?"
    - "Delete" and "Cancel" buttons; dismiss/cancel aborts deletion
    - Use existing ConfirmModal pattern from `src/components/ui/ConfirmModal.jsx` as reference
    - _Requirements: 16.1, 16.2, 16.3_

  - [ ] 5.4 Create ExtraBillsPanel component
    - Create `src/components/extra-bills/ExtraBillsPanel.jsx`
    - List all extra bills for the current month grouped by category
    - Show bill title, amount, billing mode badge, member count, and category tag
    - Edit button opens BillForm in edit mode (admin/manager only)
    - Delete button opens DeleteConfirmModal (admin/manager only)
    - Member role: read-only view without CRUD controls
    - "Add Extra Bill" button opens BillForm in create mode (admin/manager only)
    - Display success/error toasts on delete operations
    - _Requirements: 10.1, 10.2, 14.3, 16.4, 16.5_

  - [ ] 5.5 Create NextMonthPreview component
    - Create `src/components/extra-bills/NextMonthPreview.jsx`
    - List all recurring bills for the current month with title, billing mode, and projected amount
    - Show carry-forward date (first day of next month)
    - "Disable Recurring" button per bill → calls `toggleRecurring(id, false)`, shows confirmation toast
    - "Carry Forward All" button → opens confirmation, then calls `carryForwardRecurringBills`
    - Allow admin to review/modify parameters before confirming carry-forward
    - Real-time updates via onSnapshot (bills disappear from preview when `isRecurring` set to false)
    - _Requirements: 8.3, 8.4, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 6. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integrate with AppShell and routing
  - [ ] 7.1 Wire ExtraBillsPanel into AppShell
    - Modify `src/components/AppShell.jsx` to import and render ExtraBillsPanel
    - Pass `extraCosts`, `members`, `ownerId`, and `userProfile` props
    - Ensure lazy-loading is maintained (dynamic import for extra-bills components)
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 7.2 Update useMessData hook for member role extra costs visibility
    - Verify `src/hooks/useMessData.js` already subscribes to `extraCosts` for all roles
    - If member role doesn't receive `extraCosts`, add the subscription
    - Ensure no unnecessary Firestore reads are introduced
    - _Requirements: 9.1, 10.2_

- [ ] 8. Integrate with Reports page
  - [ ] 8.1 Add Extra Bills section to ReportsPage
    - Modify `src/pages/ReportsPage.jsx` to display a separate "Extra Bills" section
    - Show each extra bill title, total amount, and per-member share in the member breakdown
    - Display three distinct cost sections in member bill: "Meal Cost", "Bazaar Share", "Extra Bills Share"
    - Show "Final Total" row summing all three sections
    - When member is excluded from a bill, that bill does not appear in their breakdown
    - _Requirements: 7.3, 7.4, 15.1, 15.2, 15.3, 15.5_

  - [ ] 8.2 Add category analytics to ReportsPage
    - Add "Extra Bills by Category" summary section showing each category name and total for current month
    - Group bills by category and display subtotals
    - _Requirements: 14.3, 14.4_

  - [ ]* 8.3 Write property test: Category grouping correctness
    - **Property 5: Category grouping correctness**
    - Generate random sets of bills with random categories, group them
    - Verify subtotals sum to overall total and each category subtotal is correct
    - **Validates: Requirements 14.3**

- [ ] 9. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The critical change in task 2.1 separates extra costs from meal rate — this is the most impactful modification to existing behavior
- Legacy documents are handled via normalization at calculation time, not via Firestore migration
- All new components go in `src/components/extra-bills/` to maintain modularity
- Existing `onSnapshot` subscription in `useMessData` already covers `extraCosts` — minimal subscription changes needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "4.1"] },
    { "id": 3, "tasks": ["5.1", "5.3"] },
    { "id": 4, "tasks": ["5.2", "5.4"] },
    { "id": 5, "tasks": ["5.5", "7.1", "7.2"] },
    { "id": 6, "tasks": ["8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3"] }
  ]
}
```
