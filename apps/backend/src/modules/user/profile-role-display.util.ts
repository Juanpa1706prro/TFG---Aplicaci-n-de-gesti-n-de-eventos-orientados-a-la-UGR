import {
  StaffFunction,
  USER_DEGREE_LABELS,
  USER_FACULTY_LABELS,
  UserDegree,
  UserFaculty,
} from './user-enums';

// -------------------------------------------------------------------
// Profile role display utilities
// Builds role sections for public profile API responses.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

/** Single labeled field in a role section. */
export type ProfileRoleFieldView = {
  key: string;
  label: string;
  value: string;
};

/** Group of fields for one staff function on a public profile. */
export type ProfileRoleSectionView = {
  function: StaffFunction;
  title: string;
  fields: ProfileRoleFieldView[];
};

/** Roles with implemented profile data (extend when new entities are added). */
export const PROFILE_DISPLAY_IMPLEMENTED_ROLES: StaffFunction[] = [
  StaffFunction.ESTUDIANTE,
  StaffFunction.PROFESOR,
];

/** Student profile slice used when building role sections. */
export type StudentProfileSlice = {
  faculty: string;
  campus: string;
  degree: string;
} | null;

// ------------------------------------------------------------
// Public functions
// ------------------------------------------------------------

/**
 * Role sections for another user's profile: one per implemented function with data.
 * Order: student, then professor.
 * @param {StaffFunction[]} staffFunctions - All functions on the account.
 * @param {StudentProfileSlice} studentProfile - Student enum codes or null.
 * @param {string | null} department - Staff department when applicable.
 * @returns {ProfileRoleSectionView[]}
 */
export function buildPublicProfileRoleSections(
  staffFunctions: StaffFunction[],
  studentProfile: StudentProfileSlice,
  department: string | null,
): ProfileRoleSectionView[] {
  const sections: ProfileRoleSectionView[] = [];
  const roles = new Set(staffFunctions);

  if (roles.has(StaffFunction.ESTUDIANTE) && studentProfile) {
    const fields = buildStudentFields(studentProfile);
    if (fields.length > 0) {
      sections.push({
        function: StaffFunction.ESTUDIANTE,
        title: staffFunctionTitle(StaffFunction.ESTUDIANTE),
        fields,
      });
    }
  }

  if (roles.has(StaffFunction.PROFESOR) && hasText(department)) {
    sections.push({
      function: StaffFunction.PROFESOR,
      title: staffFunctionTitle(StaffFunction.PROFESOR),
      fields: buildProfessorFields(department!),
    });
  }

  return sections;
}

/**
 * Staff function chips limited to roles with a display implementation.
 * @param {StaffFunction[]} staffFunctions - All functions on the account.
 * @returns {StaffFunction[]}
 */
export function filterImplementedStaffFunctions(
  staffFunctions: StaffFunction[],
): StaffFunction[] {
  const implemented = new Set(PROFILE_DISPLAY_IMPLEMENTED_ROLES);
  return staffFunctions.filter((fn) => implemented.has(fn));
}

// ------------------------------------------------------------
// Private helpers
// ------------------------------------------------------------

function hasText(v: string | null | undefined): boolean {
  return !!v && v.trim().length > 0;
}

function staffFunctionTitle(fn: StaffFunction): string {
  switch (fn) {
    case StaffFunction.ESTUDIANTE:
      return 'Estudiante';
    case StaffFunction.PROFESOR:
      return 'Profesor / Profesora';
    default:
      return fn;
  }
}

function fieldHasValue(v: unknown): boolean {
  return v != null && String(v).trim().length > 0;
}

function buildStudentFields(
  studentProfile: NonNullable<StudentProfileSlice>,
): ProfileRoleFieldView[] {
  const fields: ProfileRoleFieldView[] = [];
  if (fieldHasValue(studentProfile.faculty)) {
    const faculty = studentProfile.faculty as UserFaculty;
    fields.push({
      key: 'faculty',
      label: 'Facultad',
      value: USER_FACULTY_LABELS[faculty] ?? String(studentProfile.faculty),
    });
  }
  if (fieldHasValue(studentProfile.campus)) {
    fields.push({
      key: 'campus',
      label: 'Campus',
      value: String(studentProfile.campus),
    });
  }
  if (fieldHasValue(studentProfile.degree)) {
    const degree = studentProfile.degree as UserDegree;
    fields.push({
      key: 'degree',
      label: 'Titulación',
      value: USER_DEGREE_LABELS[degree] ?? String(studentProfile.degree),
    });
  }
  return fields;
}

function buildProfessorFields(department: string): ProfileRoleFieldView[] {
  return [
    {
      key: 'department',
      label: 'Departamento / instituto',
      value: department.trim(),
    },
  ];
}
