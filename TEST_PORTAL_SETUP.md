# 🎯 TEST PORTAL - COMPLETE SETUP

## Portal URL
**http://localhost:3001/**

---

## ✅ TEST STAFF ACCOUNT CREATED

```
Email: teststaff@welona.com
Password: Test@123
Branch: Banjara Hills
Role: Full Access (All Permissions)
Status: Active
2FA: Disabled
```

---

## 📊 DATA READY IN TEST PORTAL

### 1. **CUSTOMERS** (5 Created)
- Rajesh Sharma (Individual) - Jubilee Hills
- Priya Enterprises (Business) - Banjara Hills
- Amit Patel (Individual) - Bandra West
- Health Plus Solutions (Business) - Jubilee Hills
- Sneha Gupta (Individual) - Banjara Hills

**View**: `/admin/customers`

---

### 2. **EMPLOYEES** (25 Created)
All with complete HR data:
- Rohit Sharma (Sr Branch Manager)
- Priya Kapoor (Doctor)
- Karthik Iyer (Therapist)
- And 22 more...

**View**: `/admin/hr/employee`

---

### 3. **BRANCHES** (8 Available)
- Jubilee Hills (JH001)
- Banjara Hills (BH002)
- Bandra West (BW003)
- Powai (PW004)
- Koramangala (KR005)
- Indiranagar (IN006)
- Connaught Place (CP007)
- Plus 1 more

---

## 🚀 QUICK LOGIN FLOW

1. **Go to**: http://localhost:3001/
2. **Click**: "Auto-fill credentials" button
3. **Email fills**: teststaff@welona.com
4. **Password fills**: Test@123
5. **Click**: Sign In
6. **Redirects to**: Dashboard

---

## 📍 ALL MODULES AVAILABLE IN TEST PORTAL

### ✅ **Dashboard** (`/admin`)
- Sales KPIs
- Pipeline overview
- Revenue metrics
- Staff leaderboard

### ✅ **Inventory** (`/admin/inventory`)
- Stock levels
- Warehouses
- Purchase Orders
- Goods Receipts
- Stock Transfers
- Alerts & Reports
- Batch Management

### ✅ **Customers** (`/admin/customers`)
- 5 test customers (see list above)
- Customer profiles
- All sub-modules:
  - Bookings
  - Packages
  - Offers
  - Medical Reports
  - Prescriptions
  - Documents
  - Feedback
  - Follow-ups
  - Sales History

### ✅ **Sales** (`/admin/sales`)
- Enquiries/Leads
- Quotations
- Orders
- Invoices
- Payments
- Delivery Tracking

### ✅ **HR** (`/admin/hr`)
- Dashboard
- 25 Employees (see list above)
- Attendance
- Leaves
- Payroll

### ✅ **Reports** (`/admin/report`)
- Sales Reports
- Service Reports
- Call/Media Reports
- Cash Reports
- Incentives

---

## 🔑 ACCESS LEVELS

**Test Staff (teststaff@welona.com)**:
- ✅ View ALL branches
- ✅ Create/Edit customers in any branch
- ✅ View sales from all branches
- ✅ Manage inventory (all branches)
- ✅ Full HR access
- ✅ View all reports

**Branch User (testuser / Test@123)**:
- ✅ Jubilee Hills only
- Limited to branch data
- Read-only HR

---

## 🎯 TEST SCENARIOS

### Test 1: Login as Staff
1. Go http://localhost:3001/
2. Auto-fill: teststaff@welona.com / Test@123
3. ✅ Should see Dashboard

### Test 2: View Customers
1. Click: `/admin/customers`
2. ✅ Should see 5 customers

### Test 3: View Employees
1. Click: `/admin/hr/employee`
2. ✅ Should see 25 employees

### Test 4: View Sales
1. Click: `/admin/sales`
2. ✅ Should see sales pipeline

### Test 5: Inventory
1. Click: `/admin/inventory`
2. ✅ Should see products and stock

---

## ✨ READY TO TEST

**Everything is configured and ready!**

Start here: **http://localhost:3001/login**

Use:
- Email: `teststaff@welona.com`
- Password: `Test@123`

All modules and data are populated! 🎉
