# Requirements Document

## Introduction

This feature upgrades the existing Extra Bills system in MessManager to support two distinct billing modes: **Total Shared Bill** (a fixed total amount split equally among selected members) and **Per Member Unit Bill** (a per-member amount multiplied by the count of selected members). The upgrade enables admins to flexibly manage recurring shared expenses like Wifi, Electricity, Gas, Khala bills, and Cleaning bills while preserving the existing glassmorphism UI, mobile responsiveness, and integration with the monthly billing/reports system.

## Glossary

- **Extra_Bill**: A shared expense entry stored in the `extraCosts` Firestore collection, now extended with billing mode, member selection, and recurrence metadata.
- **Billing_Mode**: The calculation strategy for an Extra Bill — either `total_shared` or `per_member_unit`.
- **Total_Shared_Mode**: A billing mode where the admin enters a fixed total amount that is split equally among selected active members.
- **Per_Member_Unit_Mode**: A billing mode where the admin enters an amount per member, and the system multiplies it by the count of selected active members to derive the total.
- **Selected_Members**: The subset of active mess members who are included in a particular Extra Bill's cost distribution.
- **Admin**: A user with the `admin` role who can create, update, and delete Extra Bills.
- **Manager**: A user with the `manager` role who can create, update, and delete Extra Bills.
- **Member**: A user with the `member` role who has view-only access to Extra Bills.
- **Bill_Form**: The UI modal or form used by Admin or Manager to create or edit an Extra Bill.
- **Recurrence**: A configuration that marks an Extra Bill as repeating monthly with the same parameters.
- **Member_Share**: The calculated portion of an Extra Bill assigned to a single selected member.
- **Billing_Calculator**: The `calculateMonthlyBill` utility function in `src/utils/billing.js` that computes monthly settlement data.

## Requirements

### Requirement 1: Billing Mode Selection

**User Story:** As an Admin, I want to choose a billing mode when creating an Extra Bill, so that I can apply the correct calculation strategy for different types of shared expenses.

#### Acceptance Criteria

1. WHEN the Admin opens the Bill_Form to create a new Extra_Bill, THE Bill_Form SHALL display a Billing_Mode selector with two options: "Total Shared Bill" and "Per Member Unit Bill".
2. THE Bill_Form SHALL default the Billing_Mode selector to "Total Shared Bill" when no prior selection exists.
3. WHEN the Admin selects "Total Shared Bill" mode, THE Bill_Form SHALL display a single amount input field labeled "Total Amount".
4. WHEN the Admin selects "Per Member Unit Bill" mode, THE Bill_Form SHALL display a single amount input field labeled "Amount Per Member".
5. WHEN the Admin switches Billing_Mode, THE Bill_Form SHALL clear the amount input field and recalculate any displayed totals.

### Requirement 2: Member Selection

**User Story:** As an Admin, I want to select which active members are included in an Extra Bill, so that only relevant members share the cost.

#### Acceptance Criteria

1. THE Bill_Form SHALL display a list of all active members with individual checkboxes for inclusion or exclusion.
2. THE Bill_Form SHALL pre-select all active members by default when creating a new Extra_Bill.
3. WHEN the Admin toggles a member's checkbox, THE Bill_Form SHALL immediately recalculate and display the updated total amount and per-member share.
4. IF the Admin attempts to save an Extra_Bill with zero Selected_Members, THEN THE Bill_Form SHALL display a validation error "At least one member must be selected" and prevent submission.
5. THE Bill_Form SHALL display a "Select All" and "Deselect All" toggle to quickly manage member selection.
6. THE Bill_Form SHALL display the count of Selected_Members alongside the member list (e.g., "3 of 5 members selected").

### Requirement 3: Total Shared Bill Calculation

**User Story:** As an Admin, I want the system to split a total amount equally among selected members, so that shared utility bills like Wifi and Electricity are distributed fairly.

#### Acceptance Criteria

1. WHEN the Billing_Mode is "Total Shared Bill" and the Admin enters a total amount, THE Billing_Calculator SHALL divide the total amount equally among all Selected_Members.
2. WHEN the Billing_Mode is "Total Shared Bill", THE Bill_Form SHALL display the calculated Member_Share as "Per Member: ৳X" in real-time as the Admin types.
3. IF the total amount is not evenly divisible by the number of Selected_Members, THEN THE Billing_Calculator SHALL round each Member_Share to two decimal places.
4. WHEN the number of Selected_Members changes, THE Billing_Calculator SHALL recalculate the Member_Share using the updated count.

### Requirement 4: Per Member Unit Bill Calculation

**User Story:** As an Admin, I want to enter a per-member amount and have the system calculate the total automatically, so that bills like Khala and Cleaning are computed correctly.

#### Acceptance Criteria

1. WHEN the Billing_Mode is "Per Member Unit Bill" and the Admin enters an amount per member, THE Billing_Calculator SHALL multiply the per-member amount by the count of Selected_Members to derive the total.
2. WHEN the Billing_Mode is "Per Member Unit Bill", THE Bill_Form SHALL display the calculated total as "Total: ৳X" in real-time as the Admin types.
3. WHEN the number of Selected_Members changes, THE Billing_Calculator SHALL recalculate the total using the updated member count.

### Requirement 5: Extra Bill Persistence

**User Story:** As an Admin, I want Extra Bills to be saved with all billing mode and member selection data, so that the information is available for reports and future reference.

#### Acceptance Criteria

1. WHEN the Admin submits a valid Extra_Bill, THE System SHALL store the document in the `extraCosts` Firestore collection with fields: `ownerId`, `title`, `billingMode`, `amount` (the admin-entered value), `totalAmount` (the calculated total), `selectedMemberIds` (array of member IDs), `memberShare` (calculated per-member amount), `date`, `isRecurring`, and `createdAt`.
2. THE System SHALL validate that `amount` is a positive number before saving.
3. THE System SHALL validate that `title` is a non-empty string before saving.
4. WHEN an Extra_Bill is saved successfully, THE System SHALL display a success toast notification.
5. IF saving an Extra_Bill fails, THEN THE System SHALL display an error toast notification with the failure reason.

### Requirement 6: Extra Bill Editing

**User Story:** As an Admin, I want to edit existing Extra Bills, so that I can correct amounts, change billing modes, or update member selections.

#### Acceptance Criteria

1. WHEN the Admin opens an existing Extra_Bill for editing, THE Bill_Form SHALL populate all fields with the stored values including Billing_Mode, amount, Selected_Members, and recurrence setting.
2. WHEN the Admin modifies and saves an Extra_Bill, THE System SHALL update the Firestore document with the new values and recalculate `totalAmount` and `memberShare`.
3. THE System SHALL preserve the original `createdAt` timestamp when updating an Extra_Bill.

### Requirement 7: Monthly Report Integration

**User Story:** As a Member, I want Extra Bills to appear in my monthly report with a breakdown of my share, so that I understand all charges contributing to my due amount.

#### Acceptance Criteria

1. THE Billing_Calculator SHALL include each member's accumulated Extra_Bill shares in their total monthly bill calculation.
2. THE Billing_Calculator SHALL only charge a member for Extra_Bills where their ID appears in the `selectedMemberIds` array.
3. WHEN generating the monthly report, THE Reports_Page SHALL display a separate "Extra Bills" section listing each Extra_Bill title, total amount, and the member's individual share.
4. THE Reports_Page SHALL include the sum of all Extra_Bill shares in the member's total due amount.

### Requirement 8: Recurring Monthly Bills

**User Story:** As an Admin, I want to mark Extra Bills as recurring, so that monthly expenses like Wifi and Khala bills are automatically carried forward each month.

#### Acceptance Criteria

1. THE Bill_Form SHALL display a "Recurring Monthly" toggle switch for each Extra_Bill.
2. WHEN an Extra_Bill is marked as recurring, THE System SHALL store `isRecurring: true` in the document.
3. WHEN a new month begins and recurring Extra_Bills exist from the previous month, THE System SHALL provide a mechanism for the Admin to carry forward recurring bills with the same parameters (title, billingMode, amount, selectedMemberIds).
4. WHEN carrying forward a recurring bill, THE System SHALL allow the Admin to review and modify the parameters before confirming.

### Requirement 9: Real-Time Updates

**User Story:** As a Member, I want to see Extra Bill changes reflected immediately without refreshing, so that I always have current information.

#### Acceptance Criteria

1. THE System SHALL use Firestore `onSnapshot` real-time subscriptions to listen for changes to the `extraCosts` collection.
2. WHEN an Extra_Bill is created, updated, or deleted, THE System SHALL reflect the change in all connected clients within the latency of the Firestore real-time sync.
3. WHEN an Extra_Bill changes, THE Billing_Calculator SHALL automatically recompute affected member bills.

### Requirement 10: Access Control

**User Story:** As a system administrator, I want role-based access control on Extra Bills, so that only authorized users can manage shared expenses.

#### Acceptance Criteria

1. WHILE the user has the "admin" or "manager" role, THE System SHALL allow creating, editing, and deleting Extra_Bills.
2. WHILE the user has the "member" role, THE System SHALL display Extra_Bills in read-only mode without create, edit, or delete controls.
3. THE Firestore security rules SHALL enforce that only users with `canManageOps` permission can write to the `extraCosts` collection.

### Requirement 11: UI Consistency and Responsiveness

**User Story:** As a user, I want the Extra Bills interface to match the existing app design and work well on mobile, so that the experience is cohesive across all devices.

#### Acceptance Criteria

1. THE Bill_Form SHALL use the existing shared UI components (Modal, Button, Input, Select) from the component library.
2. THE Extra_Bills interface SHALL apply the glassmorphism theme tokens consistent with the rest of the application.
3. THE Bill_Form SHALL render correctly on viewports from 320px to 1920px width.
4. THE member selection list SHALL be scrollable when the member count exceeds the visible area on mobile devices.
5. THE Bill_Form SHALL use the existing MetricCard and SmartSection components for displaying bill summaries.

### Requirement 12: Backward Compatibility

**User Story:** As a system maintainer, I want the upgrade to preserve existing Extra Bill data and functionality, so that no historical records are lost.

#### Acceptance Criteria

1. THE System SHALL treat existing `extraCosts` documents without a `billingMode` field as "Total Shared Bill" mode with all active members selected.
2. THE Billing_Calculator SHALL continue to produce correct results for legacy Extra_Bill documents that lack the new fields.
3. THE System SHALL not require a data migration for existing documents — new fields are applied only when documents are created or edited.

### Requirement 13: Monthly Carry-Forward Preview

**User Story:** As an Admin, I want to see which recurring bills will automatically appear next month and be able to disable them anytime, so that I maintain control over future billing without surprises.

#### Acceptance Criteria

1. WHEN recurring Extra_Bills exist for the current month, THE Extra_Bills interface SHALL display a "Next Month Preview" section listing all bills marked as recurring with their title, billing mode, and projected amount.
2. THE "Next Month Preview" section SHALL clearly indicate the carry-forward date (first day of the next month) for each recurring bill.
3. WHEN the Admin clicks a "Disable Recurring" action on a bill in the preview, THE System SHALL set `isRecurring: false` on that Extra_Bill document and remove it from the preview list.
4. WHEN the Admin disables a recurring bill, THE System SHALL display a confirmation toast: "Recurring billing disabled for [bill title]".
5. THE "Next Month Preview" section SHALL update in real-time when recurring status changes via Firestore onSnapshot.

### Requirement 14: Bill Category Analytics

**User Story:** As an Admin, I want to see Extra Bills grouped by category in reports and the dashboard, so that I can understand spending patterns across different expense types.

#### Acceptance Criteria

1. THE Bill_Form SHALL include a "Category" dropdown field with predefined options: "Wifi", "Electricity", "Gas", "Khala", "Cleaning", "Water", "Maintenance", and "Other".
2. THE Bill_Form SHALL default the Category to "Other" when no selection is made.
3. WHEN displaying Extra_Bills on the dashboard or reports, THE System SHALL group bills by category and show subtotals per category.
4. THE Reports_Page SHALL display a "Extra Bills by Category" summary showing each category name and its total amount for the current month.
5. THE Extra_Bill document in Firestore SHALL store the category in a `category` field as a lowercase string.

### Requirement 15: Member Share Transparency

**User Story:** As a Member, I want my monthly report to clearly show separate line items for meal cost, bazaar share, and extra bill share, so that I understand exactly how my total due is calculated.

#### Acceptance Criteria

1. THE member bill breakdown in the Reports_Page SHALL display three distinct cost sections: "Meal Cost", "Bazaar Share", and "Extra Bills Share".
2. THE "Extra Bills Share" section SHALL list each Extra_Bill title and the member's individual share amount for that bill.
3. THE member bill breakdown SHALL display a "Final Total" row that sums Meal Cost + Bazaar Share + Extra Bills Share.
4. THE Billing_Calculator SHALL compute `extraBillsTotal` as a separate field in each member's bill object, representing the sum of all their Extra_Bill shares.
5. WHEN a member is excluded from an Extra_Bill (not in `selectedMemberIds`), THEN that bill SHALL NOT appear in their share breakdown and SHALL NOT contribute to their total.

### Requirement 16: Safe Delete Protection

**User Story:** As an Admin, I want deletion of Extra Bills to require confirmation with additional warnings for recurring bills, so that accidental deletions are prevented.

#### Acceptance Criteria

1. WHEN the Admin clicks delete on a non-recurring Extra_Bill, THE System SHALL display a confirmation modal with the message: "Delete [bill title]? This action cannot be undone."
2. WHEN the Admin clicks delete on a recurring Extra_Bill, THE System SHALL display an enhanced confirmation modal with the warning: "This is a recurring bill. Deleting it will also stop future monthly carry-forwards. Are you sure?"
3. THE confirmation modal SHALL require the Admin to click an explicit "Delete" button to proceed — dismissing the modal or clicking "Cancel" SHALL abort the deletion.
4. WHEN deletion is confirmed and successful, THE System SHALL display a success toast: "Extra bill deleted".
5. IF deletion fails, THEN THE System SHALL display an error toast with the failure reason and the bill SHALL remain unchanged.
