# Staff Admin Side Features

## Overview
All branch admin functionalities are now available to staff/admin users through the same endpoints using `requireAdminOrBranchAuth` authentication.

## Features Available to Staff Users

### 1. Dashboard
- **Route:** `/admin` or `/admin/sales`
- **API:** `GET /api/v1/admin/sales/dashboard`
- **Access:** Full organization-wide dashboard
- **Difference from Branch Users:** Staff see all branches' data; branch users see only their branch

### 2. Inventory Management
**Routes & Sub-modules:**
- Warehouses: `/admin/inventory/warehouses`
- Suppliers: `/admin/inventory/suppliers`
- Purchase Orders: `/admin/inventory/purchase-orders`
- Goods Receipts: `/admin/inventory/grn`
- Stock Transfers: `/admin/inventory/transfers`
- Stock Reports: `/admin/inventory/reports`
- Batch Management: `/admin/inventory/batches`
- Alerts: `/admin/inventory/alerts`

**Access Pattern:**
- Staff: View/manage ALL branches' inventory
- Branch Users: View/manage ONLY their branch's inventory

### 3. Customer Management
**Routes & Sub-modules:**
- Customer List: `/admin/customers`
- Customer Profile: `/admin/customers/[id]`
- Bookings: `/admin/customers/[id]/bookings`
- Packages: `/admin/customers/[id]/packages`
- Offers: `/admin/customers/[id]/offers`
- Medical Reports: `/admin/customers/[id]/medical-reports`
- Prescriptions: `/admin/customers/[id]/prescriptions`
- Documents: `/admin/customers/[id]/documents`
- History: `/admin/customers/[id]/history`
- Sales: `/admin/customers/[id]/sales`
- Feedback: `/admin/customers/[id]/feedback`
- Follow-ups: `/admin/customers/[id]/followups`

**Access Pattern:**
- Staff: View/manage ALL branches' customers
- Branch Users: View/manage ONLY their branch's customers

### 4. Sales Pipeline
**Routes & Sub-modules:**
- Sales Hub: `/admin/sales`
- Enquiries/Leads: `/admin/sales/enquiries`
- Lead Details: `/admin/sales/enquiries/[id]`
- Follow-ups: `/admin/sales/enquiries/[id]/followups`
- Quotations: `/admin/sales/quotations`
- Orders: `/admin/sales/orders`
- Invoices: `/admin/sales/invoices`

**Access Pattern:**
- Staff: View/manage ALL branches' sales
- Branch Users: View/manage ONLY their branch's sales

### 5. HR Management
**Routes & Sub-modules:**
- HR Dashboard: `/admin/hr/dashboard`
- Employees: `/admin/hr/employee`
- Attendance: `/admin/hr/attendance`
- Leaves: `/admin/hr/leaves`

**Access Pattern:**
- Staff: View/manage ALL branches' HR data (read/write)
- Branch Users: View ONLY their branch's HR data (read-only)

### 6. Reports
**Routes:**
- Sales Reports: `/admin/report/sales`
- Service Reports: `/admin/report/services`
- Call/Media Reports: `/admin/report/calls-media`
- Cash Reports: `/admin/report/cash`
- Incentives Reports: `/admin/report/incentives`

**Access Pattern:**
- Staff: View ALL branches' reports
- Branch Users: Not yet implemented with branch scope

## Authentication & Authorization

### For Staff Users:
- Uses `requireAdminAuth` which validates JWT and checks staff role permissions
- Accesses all organization data (org-wide scope)
- Can perform all read/write operations based on role permissions

### For Branch Users:
- Uses `requireAdminOrBranchAuth` which accepts both admin and branch sessions
- Automatically scoped to their branch via `branchScope`
- Read-only access to reference masters
- Write access to operational data (inventory, sales, customers) for their branch only

## API Response Format

All routes return consistent API envelope:
```json
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operation successful"
}
```

Errors return:
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message"
}
```

## Frontend Hooks

### Staff-Scoped Hooks (Organization-wide):
- `useAdminSales()` - Sales operations (org-wide)
- `useAdminCustomers()` - Customer operations (org-wide)
- `useCash()` - Cash management
- `useInventory()` - Inventory operations (org-wide)

### Branch-Scoped Hooks (Auto-scoped via API):
- Same hooks work for both - the API automatically applies branchScope for branch users
- No separate "branch" hooks needed

## Navigation

Staff users see:
- Dashboard ✅
- Master (all reference data) ✅
- Inventory (all branches) ✅
- Customers (all branches) ✅
- Sales (all branches) ✅
- HR (all branches) ✅
- Reports (all branches) ✅
- Cancellation ✅
- Admin ✅
- Settings ✅

## Permissions

Staff users can control access via Role-based permissions:
- `dashboard:*` - Dashboard access
- `inventory:*` - Inventory management
- `customers:*` - Customer management
- `sales:*` - Sales management
- `hr:*` - HR management
- `report:*` - Report viewing

Branch users have implicit permissions:
- Full access to their branch's operational data
- Read-only access to reference masters

## Testing Credentials

### Staff User:
- Email: `teststaff@welona.com`
- Password: `Test@123`
- Access: Full admin panel

### Branch User:
- Username: `testuser`
- Password: `Test@123`
- Access: Jubilee Hills branch only

---

All functionalities that work for branch users should now be available to staff users with organization-wide scope.
