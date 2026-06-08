# ⚡ QUICK TEST SETUP GUIDE

## ✅ ALREADY SETUP IN YOUR SYSTEM:

### 1. **Staff/Login Account**
```
Email: teststaff@welona.com
Password: Test@123
Branch: Banjara Hills
Access: Full Admin Panel
Login: http://localhost:3001/login
```

### 2. **Customers (5 Created)**
- Rajesh Sharma (Individual)
- Priya Enterprises (Business)
- Amit Patel (Individual)
- Health Plus Solutions (Business)
- Sneha Gupta (Individual)

View: `/admin/customers`

### 3. **Employees (25 Created in May)**
All staff members with designations, departments, and branches
View: `/admin/hr/employee`

### 4. **Branches (8 Available)**
- Jubilee Hills (JH001)
- Banjara Hills (BH002)
- Bandra West (BW003)
- Powai (PW004)
- Koramangala (KR005)
- Indiranagar (IN006)
- Connaught Place (CP007)
- And more...

---

## 🚀 ALL MODULES AVAILABLE IN STAFF ADMIN:

### ✨ Dashboard
- **URL**: `/admin`
- **Data**: Sales KPIs, pipeline metrics, staff performance
- **Branch Scope**: Organization-wide (all branches)

### 📦 Inventory
- **URL**: `/admin/inventory`
- **Features**:
  - Stock management
  - Warehouses
  - Purchase orders
  - Goods receipts
  - Stock transfers
  - Alerts & Reports
- **Branch Scope**: All branches

### 👥 Customers  
- **URL**: `/admin/customers`
- **Features**:
  - Customer profiles (5 test customers ready)
  - Bookings, Packages, Offers
  - Prescriptions, Medical Reports
  - Documents, Feedback
  - Sales history
- **Branch Scope**: All branches

### 💼 Sales
- **URL**: `/admin/sales`
- **Features**:
  - Enquiries/Leads
  - Quotations
  - Orders
  - Invoices
  - Payments
  - Delivery tracking
- **Branch Scope**: All branches

### 👨‍💼 HR
- **URL**: `/admin/hr`
- **Features**:
  - HR Dashboard
  - Employees (25 test employees)
  - Attendance
  - Leaves
  - Payroll
- **Branch Scope**: All branches (read/write)

### 📊 Reports
- **URL**: `/admin/report`
- **Features**:
  - Sales reports
  - Service reports
  - Cash reports
  - Incentives
- **Branch Scope**: All branches

---

## 🔐 BRANCH LOGIN (Scoped Access):

```
URL: http://localhost:3001/admin/branch-login
Username: testuser
Password: Test@123
Branch: Jubilee Hills (Limited to this branch only)
```

---

## 📝 QUICK TESTING CHECKLIST:

- [ ] Login as Staff: teststaff@welona.com / Test@123
- [ ] View Dashboard: `/admin`
- [ ] View Customers: `/admin/customers` (5 customers visible)
- [ ] View Employees: `/admin/hr/employee` (25 employees)
- [ ] View Inventory: `/admin/inventory`
- [ ] View Sales: `/admin/sales`
- [ ] View Reports: `/admin/report`
- [ ] Try Branch Login: testuser / Test@123 (see only Jubilee Hills data)

---

## 🎯 KEY DIFFERENCES:

| Feature | Staff Admin | Branch Admin |
|---------|-----------|--------------|
| Data Access | **ALL Branches** | **Only Their Branch** |
| Customers | View/Create/Edit All | Only branch customers |
| Inventory | Manage All | Only branch stock |
| Sales | Full pipeline | Branch sales only |
| HR | Full access | Read-only, branch employees |
| Reports | All branches | Branch data only |

---

## ✨ BRANCH ADMIN MODULES NOW AVAILABLE IN STAFF ADMIN!

✓ Dashboard (Sales KPIs)  
✓ Inventory (Stock, Warehouses, POs, GRN, Transfers)  
✓ Customers (All modules)  
✓ Sales (Pipeline, Orders, Invoices)  
✓ HR (Employees, Attendance, Leaves)  
✓ Reports (Multi-branch)  

All working perfectly for staff with **organization-wide scope**!

---

## 📍 NEXT STEPS:

1. **Login**: http://localhost:3001/login
2. **Email**: teststaff@welona.com
3. **Password**: Test@123
4. **Explore**: `/admin/customers`, `/admin/sales`, `/admin/inventory`

All modules are ready to use! 🎉
