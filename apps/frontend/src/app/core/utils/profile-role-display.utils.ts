import {
  StaffFunction,
  USER_DEGREE_LABELS,
  USER_FACULTY_LABELS,
  UserDegree,
  UserFaculty,
} from '@core/constants/user-enums';
import {
  ProfileRoleSectionView,
  PublicProfileView,
  StudentProfileDto,
} from '@core/interfaces/user.profile-interface';

function fieldHasValue(v: unknown): boolean {
  return v != null && String(v).trim().length > 0;
}

function buildStudentFields(
  studentProfile: StudentProfileDto,
): ProfileRoleSectionView['fields'] {
  const fields: ProfileRoleSectionView['fields'] = [];
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

/** Construye secciones de rol en cliente si la API no las envió o vienen vacías. */
export function buildPublicProfileRoleSections(
  profile: Pick<
    PublicProfileView,
    'staffFunctions' | 'studentProfile' | 'department'
  >,
): ProfileRoleSectionView[] {
  const sections: ProfileRoleSectionView[] = [];
  const roles = new Set(profile.staffFunctions);

  if (roles.has(StaffFunction.ESTUDIANTE) && profile.studentProfile) {
    const fields = buildStudentFields(profile.studentProfile);
    if (fields.length > 0) {
      sections.push({
        function: StaffFunction.ESTUDIANTE,
        title: 'Estudiante',
        fields,
      });
    }
  }

  if (roles.has(StaffFunction.PROFESOR) && fieldHasValue(profile.department)) {
    sections.push({
      function: StaffFunction.PROFESOR,
      title: 'Profesor / Profesora',
      fields: [
        {
          key: 'department',
          label: 'Departamento / instituto',
          value: String(profile.department).trim(),
        },
      ],
    });
  }

  return sections;
}

export function ensurePublicProfileRoleSections(
  profile: PublicProfileView,
): PublicProfileView {
  const built = buildPublicProfileRoleSections(profile);
  if (built.length > 0) {
    return { ...profile, roleSections: built };
  }
  return { ...profile, roleSections: profile.roleSections ?? [] };
}

export type ActiveStaffProfileSource = {
  activeStaffFunction: StaffFunction | null;
  studentProfile: StudentProfileDto | null;
  department?: string | null;
};

/** Una sección según la función activa en sesión (mi perfil). */
export function buildActiveStaffRoleSection(
  profile: ActiveStaffProfileSource,
): ProfileRoleSectionView | null {
  const active = profile.activeStaffFunction;
  if (active == null) {
    return null;
  }

  if (active === StaffFunction.ESTUDIANTE && profile.studentProfile) {
    const fields = buildStudentFields(profile.studentProfile);
    if (fields.length > 0) {
      return {
        function: StaffFunction.ESTUDIANTE,
        title: 'Estudiante',
        fields,
      };
    }
  }

  if (
    (active === StaffFunction.PROFESOR ||
      active === StaffFunction.PDI_INVESTIGACION) &&
    fieldHasValue(profile.department)
  ) {
    const title =
      active === StaffFunction.PDI_INVESTIGACION
        ? 'PDI / Investigación'
        : 'Profesor / Profesora';
    return {
      function: active,
      title,
      fields: [
        {
          key: 'department',
          label: 'Departamento / instituto',
          value: String(profile.department).trim(),
        },
      ],
    };
  }

  return null;
}
