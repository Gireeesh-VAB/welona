export interface AdminEmployee {
  id: string;
  // Personal
  name: string;
  biometricId: string | null;
  fatherName: string | null;
  gender: string | null;
  dob: string | null;
  mobileNo: string;
  mobileAlternate: string | null;
  email: string | null;
  panNo: string | null;
  pincode: string | null;
  address: string | null;
  // Official
  employeeCode: string;
  designation: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  branch: { id: string; name: string; code: string } | null;
  zone: { id: string; stateName: string } | null;
  joiningDate: string;
  relievingDate: string | null;
  salary: number; // paise
  bankName: string | null;
  bankAccountNo: string | null;
  callerType: string | null;
  pf: boolean;
  esi: boolean;
  // Shift
  weeklyOff: string | null;
  photoUrl: string | null;
  // Audit
  ipAddress: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
