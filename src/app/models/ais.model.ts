// Domain model for the CMI AIS prototype. Terminology follows the CATS-11 /
// DLZA documentation (ISAD(G), ISAAR(CPF), OAIS, eCH-0160, PREMIS).

// ---------------------------------------------------------------- Tektonik / VE

/** Levels of the Tektonik tree. Klassifikationsknoten are structural nodes. */
export type VeStufe = 'Klassifikationsknoten' | 'Bestand' | 'Serie' | 'Dossier' | 'Einzelstück';

/** Computed access state of a VE (D1: tri-state rule). */
export type Benutzbarkeit = 'Frei einsehbar' | 'Teilweise gesuchspflichtig' | 'Gesuchspflichtig';

export type Verwertungsrecht = 'Urheberrechtlich geschützt' | 'Gemeinfrei';

/** Web workflow states of the Verzeichnungsstatus (D1-F-13). */
export type Verzeichnungsstatus = 'In Bearbeitung' | 'In Prüfung' | 'Freigegeben';

export interface HistorienEintrag {
  datum: string;
  benutzer: string;
  aktion: string;
}

/** Verzeichnungseinheit (VE) - the descriptive unit of the Tektonik (ISAD(G)). */
export interface Verzeichnungseinheit {
  id: string;
  parentId: string | null;
  stufe: VeStufe;
  signatur: string;
  titel: string;
  entstehungszeitraum?: string;
  bezugszeitraum?: string;
  /** Schutzfrist in Jahren (Basis fuer Ablauf Schutzfrist). */
  schutzfristJahre?: number;
  /** Ablauf der Schutzfrist (ISO date); Grundlage der Benutzbarkeits-Regel. */
  ablaufSchutzfrist?: string;
  verwertungsrecht?: Verwertungsrecht;
  verzeichnungsstatus: Verzeichnungsstatus;
  abgebendeStelle?: string;
  formInhalt?: string;
  verwaltungsgeschichte?: string;
  zugangsbestimmungen?: string;
  umfang?: string;
  sprachen?: string;
  archivalienart?: string;
  provenienzId?: string;
  /** Standort (Magazinobjekt-Kuerzel). */
  standortKuerzel?: string;
  akzessionId?: string;
  historie: HistorienEintrag[];
}

// ---------------------------------------------------------------- Dateien / PREMIS

export type PremisEventTyp =
  | 'Passivierung'
  | 'Ingest'
  | 'Retention'
  | 'Fixity-Pruefung'
  | 'Formatmigration';

export interface PremisEvent {
  typ: PremisEventTyp | string;
  datum: string;
  resultat: string;
  detail: string;
}

/** A real file in public/files/ with honest fixity values (see generator). */
export interface ArchivDatei {
  id: string;
  fileName: string;
  path: string;
  extension: string;
  sizeBytes: number;
  sha512: string;
  formatName: string;
  formatVersion: string;
  /** PRONOM PUID where certain, else undefined. */
  puid: string | undefined;
  pid: string;
  veSignatur: string;
  veTitel: string;
  titel: string;
  premisEvents: PremisEvent[];
  /** If set, this file is a Rendition of the referenced original file id. */
  renditionOf: string | undefined;
}

// ---------------------------------------------------------------- Akzession

export type AkzessionsStatus = 'InBearbeitung' | 'Abgeschlossen';

export interface Akzession {
  id: string;
  akzessionsnummer: string;
  titel: string;
  status: AkzessionsStatus;
  abgebendeStelle: string;
  erwerbsart: string;
  zustandskategorie?: string;
  entstehungszeitraum?: string;
  umfangLaufmeter?: number;
  bemerkungen?: string;
  uebernahmedatum: string;
  /** Cross-Link auf aus der Akzession erstellte VEs (D2-F-2). */
  erstellteVeIds: string[];
}

// ---------------------------------------------------------------- Magazin

/** Magazinobjekt = Standort (D3); hierarchisch via parentId, Kuerzel-Regeln MOBJ101-105. */
export interface MagazinObjekt {
  id: string;
  parentId: string | null;
  kuerzel: string;
  bezeichnung: string;
  kapazitaetLaufmeter?: number;
  belegtLaufmeter?: number;
}

// ---------------------------------------------------------------- Provenienz

export type ProvenienzStatus = 'InBearbeitung' | 'InPruefung' | 'Abgeschlossen';

/** ISAAR(CPF) actor types. */
export type ProvenienzTyp = 'Körperschaft' | 'Person' | 'Familie';

export interface Provenienz {
  id: string;
  /** Signatur-Feld der Provenienz (D4). */
  identifikatorNormdatei: string;
  name: string;
  typ: ProvenienzTyp;
  status: ProvenienzStatus;
  geschichte?: string;
  vorgaengerIds: string[];
  nachfolgerIds: string[];
  /** Normdatenlink (D4): GND-Identifikator, fiktiv. */
  gndId?: string;
  letzterAbgleich?: string;
}

// ---------------------------------------------------------------- Ingest / Ablieferung

/** Status einer Ablieferung (D10-F-6). */
export type AblieferungsStatus = 'ausgesondert' | 'in Verarbeitung' | 'bestätigt';

export type PruefResultat = 'ok' | 'fehler' | 'ausstehend';

export interface ValidierungsSchritt {
  schritt: string;
  resultat: PruefResultat;
  detail: string;
}

export interface Ablieferung {
  id: string;
  nummer: string;
  titel: string;
  ablieferndeStelle: string;
  status: AblieferungsStatus;
  eingangsdatum: string;
  sipFormat: string; // eCH-0160
  sipVersion: string;
  /** SIP-Paket (echte Datei) im Manifest. */
  sipDateiId?: string;
  /** Ablieferungsquittung (echtes PDF) im Manifest. */
  quittungDateiId?: string;
  validierungen: ValidierungsSchritt[];
}

/** Datei-Status im automatischen Import (D5-F-6/F-7). */
export type ImportDateiStatus = 'in Verarbeitung' | 'Success' | 'Bad' | 'Manuell';

export interface ImportDatei {
  dateiname: string;
  datum: string;
  status: ImportDateiStatus;
  log: string;
}

// ---------------------------------------------------------------- Verarbeitung (D9)

/** Task = gekapselter, parametrisierbarer Verarbeitungsschritt (D9-F-2). */
export interface AblaufTask {
  id: string;
  name: string;
  beschreibung: string;
  parameter: string[];
}

export type AusfuehrungsTyp = 'Ingest' | 'Passivierung' | 'Preservation';

/** Workflowvorlage = komponierte Task-Folge (Prozesskette/Ablauf, D9-F-3). */
export interface WorkflowVorlage {
  id: string;
  code: string; // z.B. I-25
  name: string;
  typ: AusfuehrungsTyp;
  version: number;
  beschreibung: string;
  schritte: { taskId: string; parameter?: string }[];
}

/** Zustand einer Ausfuehrung/Instanz (D9-F-1). */
export type AusfuehrungsStatus = 'wartend' | 'laufend' | 'fertig' | 'fehlgeschlagen' | 'abgebrochen';

export interface AusfuehrungsSchritt {
  name: string;
  status: AusfuehrungsStatus;
  log: string[];
}

/** Ausfuehrung = Instanz einer Workflowvorlage; laeuft fachlich im Ingest/Repository. */
export interface Ausfuehrung {
  id: string;
  nr: number;
  objekt: string; // z.B. SIP_20260430_STA_1.zip
  workflowCode: string;
  workflowName: string;
  typ: AusfuehrungsTyp;
  status: AusfuehrungsStatus;
  zeitpunkt: string;
  dauer: string;
  schritte: AusfuehrungsSchritt[];
}

// ---------------------------------------------------------------- Preservation

export type Erhaltungsstrategie = 'Migration' | 'Emulation' | 'Monitoring';

export interface FormatRisiko {
  extension: string;
  formatName: string;
  risiko: 'tief' | 'mittel' | 'hoch';
  strategie: Erhaltungsstrategie;
  begruendung: string;
}

// ---------------------------------------------------------------- App-Navigation

export type AppId =
  | 'tektonik'
  | 'magazinverwaltung'
  | 'akzessionen'
  | 'provenienzen'
  | 'datenuebernahme'
  | 'verarbeitung'
  | 'preservation';

export interface AppDefinition {
  id: AppId;
  name: string;
  icon: string; // path under public/icons/
  gruppe: 'ARCHIV' | 'INGEST UND REPOSITORY';
}

/** Kachel im Anwendungen-Grid (auch solche ohne App dahinter). */
export interface AnwendungsKachel {
  label: string;
  /** Material icon name (START group) ... */
  materialIcon?: string;
  /** ... oder extrahiertes Icon-PNG (alle anderen). */
  iconPng?: string;
  appId?: AppId;
}
