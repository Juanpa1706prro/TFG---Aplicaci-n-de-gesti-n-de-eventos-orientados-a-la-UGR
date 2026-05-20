import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { AuthService } from '@core/services/auth.services';
import {
  FullUserPayload,
  PublicProfileView,
  StudentProfileDto,
  UserProfileDetails,
} from '@core/interfaces/user.profile-interface';
import {
  StaffFunction,
  UserDegree,
  UserFaculty,
  UserGender,
  USER_DEGREE_LABELS,
  USER_FACULTY_LABELS,
} from '@core/constants/user-enums';
import { API_BASE_URL } from '@core/config/api.config';
import { routeParamFromPath } from '@core/utils/route-param.utils';

type ProfilePageView = {
  userNumber: number;
  userName?: string;
  firstName: string | null;
  lastName: string | null;
  email?: string;
  viewerIsOwner: boolean;
  staffFunctions: StaffFunction[];
  activeStaffFunction: StaffFunction | null;
  studentProfile: StudentProfileDto | null;
  department?: string | null;
  birthDate?: string | null;
  gender?: UserGender | null;
  phoneNumber?: string | null;
  bio?: string | null;
  profilePicture?: string | null;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  private readonly API_URL = API_BASE_URL;

  profileView: ProfilePageView | null = null;
  loadError = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map(
          () => routeParamFromPath(this.route.snapshot, 'userNumber'),
        ),
        filter((n): n is string => !!n),
        map((n) => parseInt(n, 10)),
        switchMap((userNumber) => {
          const currentUser = this.authService.currentUserValue;
          if (currentUser?.userNumber === userNumber) {
            return this.http
              .get<{ user: FullUserPayload }>(`${this.API_URL}/user/profile`)
              .pipe(map((res) => this.fullProfileToView(res.user)));
          }

          return this.http
            .get<{ profile: PublicProfileView }>(
              `${this.API_URL}/user/public/${userNumber}`,
            )
            .pipe(map((res) => this.publicProfileToView(res.profile)));
        }),
      )
      .subscribe({
        next: (profile) => {
          this.loadError = false;
          this.profileView = profile;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = true;
          this.profileView = null;
          this.cdr.detectChanges();
        },
      });
  }

  private fullProfileToView(user: FullUserPayload): ProfilePageView {
    const profile: UserProfileDetails = user.profile;
    return {
      userNumber: user.userNumber,
      userName: profile.userName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: user.email,
      viewerIsOwner: true,
      staffFunctions: user.staffFunctions,
      activeStaffFunction: user.activeStaffFunction,
      studentProfile: user.studentProfile,
      department: profile.department ?? null,
      birthDate: profile.birthDate,
      gender: profile.gender,
      phoneNumber: profile.phoneNumber,
      bio: profile.bio,
      profilePicture: profile.profilePicture,
    };
  }

  private publicProfileToView(profile: PublicProfileView): ProfilePageView {
    return {
      ...profile,
      activeStaffFunction: null,
    };
  }

  studentFacultyLabel(code: UserFaculty | undefined | null): string {
    if (code == null) {
      return '—';
    }
    return USER_FACULTY_LABELS[code] ?? String(code);
  }

  studentDegreeLabel(code: UserDegree | undefined | null): string {
    if (code == null) {
      return '—';
    }
    return USER_DEGREE_LABELS[code] ?? String(code);
  }

  staffFunctionLabel(fn: StaffFunction | undefined | null): string {
    switch (fn) {
      case StaffFunction.ESTUDIANTE:
        return 'Estudiante';
      case StaffFunction.PROFESOR:
        return 'Profesor / Profesora';
      case StaffFunction.PDI_INVESTIGACION:
        return 'PDI / Investigación';
      case StaffFunction.SECRETARIA_ADMINISTRACION:
        return 'Secretaría / Administración';
      case StaffFunction.BIBLIOTECA:
        return 'Biblioteca';
      case StaffFunction.RECTORADO:
        return 'Rectorado / Dirección';
      case StaffFunction.SEGURIDAD:
        return 'Seguridad / Servicios';
      case StaffFunction.OTRO_PERSONAL:
        return 'Otro personal UGR';
      default:
        return '—';
    }
  }

  isStudentActive(profile: ProfilePageView): boolean {
    return (
      profile.activeStaffFunction === StaffFunction.ESTUDIANTE ||
      (profile.activeStaffFunction == null && profile.studentProfile != null)
    );
  }

  isTeachingOrResearchActive(profile: ProfilePageView): boolean {
    return (
      profile.activeStaffFunction === StaffFunction.PROFESOR ||
      profile.activeStaffFunction === StaffFunction.PDI_INVESTIGACION
    );
  }
}
