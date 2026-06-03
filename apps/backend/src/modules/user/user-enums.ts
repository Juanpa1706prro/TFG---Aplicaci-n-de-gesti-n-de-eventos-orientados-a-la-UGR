// -------------------------------------------------------------------
// User domain enums and display labels
// Persisted enum codes plus Spanish labels for faculties and degrees.
// -------------------------------------------------------------------

/** Platform capabilities for the current session (from activeStaffFunction). */
export enum GlobalCapability {
  /** View public events and register attendance. */
  ATTEND_EVENTS = 'ATTEND_EVENTS',
  /** Create events and manage own events at platform level (teaching / research staff). */
  CREATE_AND_MANAGE_OWN_EVENTS = 'CREATE_AND_MANAGE_OWN_EVENTS',
  /** Invite co-managers to owned events. */
  INVITE_EVENT_MANAGERS = 'INVITE_EVENT_MANAGERS',
}

export enum SystemRole {
  /** Base role; university functions are modeled with StaffFunction. */
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

/** University staff functions (a user may have several). */
export enum StaffFunction {
  ESTUDIANTE = 'ESTUDIANTE',
  PROFESOR = 'PROFESOR',
  PDI_INVESTIGACION = 'PDI_INVESTIGACION',
  SECRETARIA_ADMINISTRACION = 'SECRETARIA_ADMINISTRACION',
  BIBLIOTECA = 'BIBLIOTECA',
  RECTORADO = 'RECTORADO',
  SEGURIDAD = 'SEGURIDAD',
  OTRO_PERSONAL = 'OTRO_PERSONAL',
}

export enum UserGender {
  MALE = 'Masculino',
  FEMALE = 'Femenino',
  OTHER = 'Otro',
  NOT_SPECIFIED = 'Prefiero no decirlo',
}

export enum UserCampus {
  AYNADAMAR = 'AYNADAMAR',
  CARTUJA = 'CARTUJA',
  FUENTENUEVA = 'FUENTENUEVA',
  PTS = 'PTS',
  CENTRO = 'CENTRO',
  CEUTA = 'CEUTA',
  MELILLA = 'MELILLA',
}

/**
 * Short code (≤20 chars) stored in DB. Long label in `USER_FACULTY_LABELS`.
 * Same list for onboarding and event location presets.
 */
export enum UserFaculty {
  ETSIIT = 'ETSIIT',
  ETSA = 'ETSA',
  ETSIE = 'ETSIE',
  ETSCCP = 'ETSCCP',
  FBA = 'FBA',
  FCC = 'FCC',
  FCCD = 'FCCD',
  FCE = 'FCE',
  FCEE = 'FCEE',
  FCPY = 'FCPY',
  FCS = 'FCS',
  FCD = 'FCD',
  FDE = 'FDE',
  FFA = 'FFA',
  FFL = 'FFL',
  FME = 'FME',
  FOD = 'FOD',
  FPS = 'FPS',
  FTS = 'FTS',
  FCEETC = 'FCEETC',
  FCSC = 'FCSC',
  FCEDM = 'FCEDM',
  FCSM = 'FCSM',
  FCSJM = 'FCSJM',
}

export const USER_FACULTY_LABELS: Record<UserFaculty, string> = {
  [UserFaculty.ETSIIT]:
    'ESCUELA TÉCNICA SUPERIOR DE INGENIERÍAS INFORMÁTICA Y DE TELECOMUNICACIÓN',
  [UserFaculty.ETSA]: 'ESCUELA TÉCNICA SUPERIOR DE ARQUITECTURA',
  [UserFaculty.ETSIE]: 'ESCUELA TÉCNICA SUPERIOR DE INGENIERÍA DE EDIFICACIÓN',
  [UserFaculty.ETSCCP]:
    'ESCUELA TÉCNICA SUPERIOR DE INGENIERÍA DE CAMINOS, CANALES Y PUERTOS',
  [UserFaculty.FBA]: 'FACULTAD DE BELLAS ARTES',
  [UserFaculty.FCC]: 'FACULTAD DE CIENCIAS',
  [UserFaculty.FCCD]: 'FACULTAD DE CIENCIAS DEL DEPORTE',
  [UserFaculty.FCE]: 'FACULTAD DE CIENCIAS DE LA EDUCACIÓN',
  [UserFaculty.FCEE]: 'FACULTAD DE CIENCIAS ECONÓMICAS Y EMPRESARIALES',
  [UserFaculty.FCPY]: 'FACULTAD DE CIENCIAS POLÍTICAS Y SOCIOLOGÍA',
  [UserFaculty.FCS]: 'FACULTAD DE CIENCIAS DE LA SALUD',
  [UserFaculty.FCD]: 'FACULTAD DE COMUNICACIÓN Y DOCUMENTACIÓN',
  [UserFaculty.FDE]: 'FACULTAD DE DERECHO',
  [UserFaculty.FFA]: 'FACULTAD DE FARMACIA',
  [UserFaculty.FFL]: 'FACULTAD DE FILOSOFÍA Y LETRAS',
  [UserFaculty.FME]: 'FACULTAD DE MEDICINA',
  [UserFaculty.FOD]: 'FACULTAD DE ODONTOLOGÍA',
  [UserFaculty.FPS]: 'FACULTAD DE PSICOLOGÍA',
  [UserFaculty.FTS]: 'FACULTAD DE TRABAJO SOCIAL',
  [UserFaculty.FCEETC]:
    'FACULTAD DE EDUCACIÓN, ECONOMÍA Y TECNOLOGÍA DE CEUTA',
  [UserFaculty.FCSC]: 'FACULTAD DE CIENCIAS DE LA SALUD DE CEUTA',
  [UserFaculty.FCEDM]:
    'FACULTAD DE CIENCIAS DE LA EDUCACIÓN Y DEL DEPORTE DE MELILLA',
  [UserFaculty.FCSM]: 'FACULTAD DE CIENCIAS DE LA SALUD DE MELILLA',
  [UserFaculty.FCSJM]:
    'FACULTAD DE CIENCIAS SOCIALES Y JURÍDICAS DE MELILLA',
};

export enum UserDegree {
  ADE = 'ADE',
  ADE_DERECHO = 'ADE_DERECHO',
  ANTROPOLOGIA = 'ANTROPOLOGIA',
  CC_POLITICAS = 'CC_POLITICAS',
  CC_POL_DERECHO = 'CC_POL_DERECHO',
  CC_POL_SOCIOLOGIA = 'CC_POL_SOCIOLOGIA',
  CC_POL_PERIODISMO = 'CC_POL_PERIODISMO',
  CRIMINOLOGIA = 'CRIMINOLOGIA',
  DERECHO = 'DERECHO',
  ECONOMIA = 'ECONOMIA',
  ECONOMIA_BIL = 'ECONOMIA_BIL',
  ED_INFANTIL = 'ED_INFANTIL',
  ED_PRIMARIA = 'ED_PRIMARIA',
  ED_PRIMARIA_BIL = 'ED_PRIMARIA_BIL',
  ED_SOCIAL = 'ED_SOCIAL',
  FICO = 'FICO',
  GEOGRAFIA = 'GEOGRAFIA',
  MARKETING = 'MARKETING',
  PEDAGOGIA = 'PEDAGOGIA',
  RLRH = 'RLRH',
  SOCIOLOGIA = 'SOCIOLOGIA',
  TRABAJO_SOCIAL = 'TRABAJO_SOCIAL',
  TURISMO = 'TURISMO',

  BIOLOGIA = 'BIOLOGIA',
  BIOQUIMICA = 'BIOQUIMICA',
  BIOTECNOLOGIA = 'BIOTECNOLOGIA',
  CYTA = 'CYTA',
  CCAA = 'CCAA',
  CAFYD = 'CAFYD',
  ENFERMERIA = 'ENFERMERIA',
  ESTADISTICA = 'ESTADISTICA',
  FARMACIA = 'FARMACIA',
  FISICA = 'FISICA',
  FISIOTERAPIA = 'FISIOTERAPIA',
  GEOLOGIA = 'GEOLOGIA',
  LOGOPEDIA = 'LOGOPEDIA',
  MATEMATICAS = 'MATEMATICAS',
  MEDICINA = 'MEDICINA',
  NUTRICION = 'NUTRICION',
  ODONTOLOGIA = 'ODONTOLOGIA',
  OPTICA = 'OPTICA',
  PSICOLOGIA = 'PSICOLOGIA',
  QUIMICA = 'QUIMICA',
  TERAPIA_OCUPACIONAL = 'TERAPIA_OCUPACIONAL',

  ARQUITECTURA = 'ARQUITECTURA',
  EDIFICACION = 'EDIFICACION',
  EDIF_ADE = 'EDIF_ADE',
  ING_CIVIL = 'ING_CIVIL',
  ING_CIVIL_ADE = 'ING_CIVIL_ADE',
  TELECO = 'TELECO',
  ELECTRONICA = 'ELECTRONICA',
  INFORMATICA = 'INFORMATICA',
  INF_ADE = 'INF_ADE',
  INF_MAT = 'INF_MAT',
  ING_QUIMICA = 'ING_QUIMICA',

  ARQUEOLOGIA = 'ARQUEOLOGIA',
  BELLAS_ARTES = 'BELLAS_ARTES',
  COM_AUDIOVISUAL = 'COM_AUDIOVISUAL',
  CONSERVACION = 'CONSERVACION',
  EST_ARABES = 'EST_ARABES',
  EST_FRANCESES = 'EST_FRANCESES',
  EST_INGLESES = 'EST_INGLESES',
  FIL_CLASICA = 'FIL_CLASICA',
  FIL_HISPANICA = 'FIL_HISPANICA',
  FILOSOFIA = 'FILOSOFIA',
  HISTORIA = 'HISTORIA',
  HISTORIA_ARTE = 'HISTORIA_ARTE',
  HISTORIA_MUSICA = 'HISTORIA_MUSICA',
  INF_DOC = 'INF_DOC',
  LENGUAS_MODERNAS = 'LENGUAS_MODERNAS',
  LIT_COMPARADAS = 'LIT_COMPARADAS',
  TRADUCCION_ALEMAN = 'TRADUCCION_ALEMAN',
  TRADUCCION_ARABE = 'TRADUCCION_ARABE',
  TRADUCCION_FRANCES = 'TRADUCCION_FRANCES',
  TRADUCCION_INGLES = 'TRADUCCION_INGLES',

  CAFYD_PRIMARIA = 'CAFYD_PRIMARIA',
  ED_PRIM_FRANCES = 'ED_PRIM_FRANCES',
  ED_PRIM_INGLES = 'ED_PRIM_INGLES',
  EST_ING_HISPANICAS = 'EST_ING_HISPANICAS',
  FARM_NUTRICION = 'FARM_NUTRICION',
  FISICA_MAT = 'FISICA_MAT',
  NUT_CYTA = 'NUT_CYTA',
  TRAD_ALE_TURISMO = 'TRAD_ALE_TURISMO',
  TRAD_FRA_TURISMO = 'TRAD_FRA_TURISMO',
  TRAD_ING_TURISMO = 'TRAD_ING_TURISMO',
}

export const USER_DEGREE_LABELS: Record<UserDegree, string> = {
  [UserDegree.ADE]: 'Grado en ADE',
  [UserDegree.ADE_DERECHO]: 'Doble Grado en ADE y Derecho',
  [UserDegree.ANTROPOLOGIA]: 'Grado en Antropología Social y Cultural',
  [UserDegree.CC_POLITICAS]: 'Grado en CC. Políticas y de la Administración',
  [UserDegree.CC_POL_DERECHO]: 'Doble Grado en CC. Políticas y Derecho',
  [UserDegree.CC_POL_SOCIOLOGIA]: 'Doble Grado en CC. Políticas y Sociología',
  [UserDegree.CC_POL_PERIODISMO]: 'Doble Grado en CC. Políticas y Periodismo',
  [UserDegree.CRIMINOLOGIA]: 'Grado en Criminología',
  [UserDegree.DERECHO]: 'Grado en Derecho',
  [UserDegree.ECONOMIA]: 'Grado en Economía',
  [UserDegree.ECONOMIA_BIL]: 'Grado en Economía (Bilingüe)',
  [UserDegree.ED_INFANTIL]: 'Grado en Educación Infantil',
  [UserDegree.ED_PRIMARIA]: 'Grado en Educación Primaria',
  [UserDegree.ED_PRIMARIA_BIL]: 'Grado en Educación Primaria (Bilingüe)',
  [UserDegree.ED_SOCIAL]: 'Grado en Educación Social',
  [UserDegree.FICO]: 'Grado en Finanzas y Contabilidad',
  [UserDegree.GEOGRAFIA]: 'Grado en Geografía y Gestión del Territorio',
  [UserDegree.MARKETING]: 'Grado en Marketing e Investigación de Mercados',
  [UserDegree.PEDAGOGIA]: 'Grado en Pedagogía',
  [UserDegree.RLRH]: 'Grado en Relaciones Laborales y RR. HH.',
  [UserDegree.SOCIOLOGIA]: 'Grado en Sociología',
  [UserDegree.TRABAJO_SOCIAL]: 'Grado en Trabajo Social',
  [UserDegree.TURISMO]: 'Grado en Turismo',
  [UserDegree.BIOLOGIA]: 'Grado en Biología',
  [UserDegree.BIOQUIMICA]: 'Grado en Bioquímica',
  [UserDegree.BIOTECNOLOGIA]: 'Grado en Biotecnología',
  [UserDegree.CYTA]: 'Grado en Ciencia y Tecnología de los Alimentos',
  [UserDegree.CCAA]: 'Grado en Ciencias Ambientales',
  [UserDegree.CAFYD]: 'Grado en CC. de la Actividad Física y del Deporte',
  [UserDegree.ENFERMERIA]: 'Grado en Enfermería',
  [UserDegree.ESTADISTICA]: 'Grado en Estadística',
  [UserDegree.FARMACIA]: 'Grado en Farmacia',
  [UserDegree.FISICA]: 'Grado en Física',
  [UserDegree.FISIOTERAPIA]: 'Grado en Fisioterapia',
  [UserDegree.GEOLOGIA]: 'Grado en Geología',
  [UserDegree.LOGOPEDIA]: 'Grado en Logopedia',
  [UserDegree.MATEMATICAS]: 'Grado en Matemáticas',
  [UserDegree.MEDICINA]: 'Grado en Medicina',
  [UserDegree.NUTRICION]: 'Grado en Nutrición Humana y Dietética',
  [UserDegree.ODONTOLOGIA]: 'Grado en Odontología',
  [UserDegree.OPTICA]: 'Grado en Óptica y Optometría',
  [UserDegree.PSICOLOGIA]: 'Grado en Psicología',
  [UserDegree.QUIMICA]: 'Grado en Química',
  [UserDegree.TERAPIA_OCUPACIONAL]: 'Grado en Terapia Ocupacional',
  [UserDegree.ARQUITECTURA]: 'Grado en Estudios de Arquitectura',
  [UserDegree.EDIFICACION]: 'Grado en Edificación',
  [UserDegree.EDIF_ADE]: 'Doble Grado en Edificación y ADE',
  [UserDegree.ING_CIVIL]: 'Grado en Ingeniería Civil',
  [UserDegree.ING_CIVIL_ADE]: 'Doble Grado en Ing. Civil y ADE',
  [UserDegree.TELECO]: 'Grado en Ingeniería de Tecnologías de Telecomunicación',
  [UserDegree.ELECTRONICA]: 'Grado en Ingeniería Electrónica Industrial',
  [UserDegree.INFORMATICA]: 'Grado en Ingeniería Informática',
  [UserDegree.INF_ADE]: 'Doble Grado en Ing. Informática y ADE',
  [UserDegree.INF_MAT]: 'Doble Grado en Ing. Informática y Matemáticas',
  [UserDegree.ING_QUIMICA]: 'Grado en Ingeniería Química',
  [UserDegree.ARQUEOLOGIA]: 'Grado en Arqueología',
  [UserDegree.BELLAS_ARTES]: 'Grado en Bellas Artes',
  [UserDegree.COM_AUDIOVISUAL]: 'Grado en Comunicación Audiovisual',
  [UserDegree.CONSERVACION]:
    'Grado en Conservación y Restauración de Bienes Culturales',
  [UserDegree.EST_ARABES]: 'Grado en Estudios Árabes e Islámicos',
  [UserDegree.EST_FRANCESES]: 'Grado en Estudios Franceses',
  [UserDegree.EST_INGLESES]: 'Grado en Estudios Ingleses',
  [UserDegree.FIL_CLASICA]: 'Grado en Filología Clásica',
  [UserDegree.FIL_HISPANICA]: 'Grado en Filología Hispánica',
  [UserDegree.FILOSOFIA]: 'Grado en Filosofía',
  [UserDegree.HISTORIA]: 'Grado en Historia',
  [UserDegree.HISTORIA_ARTE]: 'Grado en Historia del Arte',
  [UserDegree.HISTORIA_MUSICA]: 'Grado en Historia y CC. de la Música',
  [UserDegree.INF_DOC]: 'Grado en Información y Documentación',
  [UserDegree.LENGUAS_MODERNAS]:
    'Grado en Lenguas Modernas y sus Literaturas',
  [UserDegree.LIT_COMPARADAS]: 'Grado en Literaturas Comparadas',
  [UserDegree.TRADUCCION_ALEMAN]:
    'Grado en Traducción e Interpretación (Alemán)',
  [UserDegree.TRADUCCION_ARABE]:
    'Grado en Traducción e Interpretación (Árabe)',
  [UserDegree.TRADUCCION_FRANCES]:
    'Grado en Traducción e Interpretación (Francés)',
  [UserDegree.TRADUCCION_INGLES]:
    'Grado en Traducción e Interpretación (Inglés)',
  [UserDegree.CAFYD_PRIMARIA]:
    'Doble Grado en CC. de la Actividad Física y Primaria',
  [UserDegree.ED_PRIM_FRANCES]:
    'Doble Grado en Primaria y Estudios Franceses',
  [UserDegree.ED_PRIM_INGLES]:
    'Doble Grado en Primaria y Estudios Ingleses',
  [UserDegree.EST_ING_HISPANICAS]:
    'Doble Grado en Estudios Ingleses y Filología Hispánica',
  [UserDegree.FARM_NUTRICION]:
    'Doble Grado en Farmacia y Nutrición Humana y Dietética',
  [UserDegree.FISICA_MAT]: 'Doble Grado en Física y Matemáticas',
  [UserDegree.NUT_CYTA]:
    'Doble Grado en Nutrición Humana y Dietética y CYTA',
  [UserDegree.TRAD_ALE_TURISMO]:
    'Doble Grado en Traducción (Alemán) y Turismo',
  [UserDegree.TRAD_FRA_TURISMO]:
    'Doble Grado en Traducción (Francés) y Turismo',
  [UserDegree.TRAD_ING_TURISMO]:
    'Doble Grado en Traducción (Inglés) y Turismo',
};
