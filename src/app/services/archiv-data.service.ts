import { Injectable, computed, signal } from '@angular/core';
import {
  Ablieferung,
  AblaufTask,
  Akzession,
  ArchivDatei,
  Ausfuehrung,
  AusfuehrungsTyp,
  Benutzbarkeit,
  FormatRisiko,
  ImportDatei,
  MagazinObjekt,
  Provenienz,
  Verzeichnungseinheit,
} from '../models/ais.model';
import { FILE_MANIFEST } from '../data/file-manifest';

// ============================================================ Tektonik (fiktiv)
// Staatsarchiv des Kantons Dossikon (fiktiver Kanton). Struktur nach ISAD(G):
// Klassifikationsknoten -> Bestand -> Serie -> Dossier -> Einzelstueck.
const VE_SEED: Omit<Verzeichnungseinheit, 'historie'>[] = [
  // --- A Regierung und Verwaltung
  { id: 'A', parentId: null, stufe: 'Klassifikationsknoten', signatur: 'A', titel: 'Regierung und Verwaltung', verzeichnungsstatus: 'Freigegeben' },
  { id: 'A1', parentId: 'A', stufe: 'Bestand', signatur: 'A 1', titel: 'Regierungsratsbeschlüsse (RRB)', entstehungszeitraum: '1850-2010', verzeichnungsstatus: 'Freigegeben', abgebendeStelle: 'Staatskanzlei des Kantons Dossikon', provenienzId: 'p1', umfang: '312 Laufmeter', sprachen: 'Deutsch', archivalienart: 'Akten', verwaltungsgeschichte: 'Der Regierungsrat ist die oberste Vollzugsbehörde des Kantons. Die Beschlussserie ist seit 1850 lückenlos überliefert.', formInhalt: 'Beschlussprotokolle mit Anträgen und Beilagen.' },
  { id: 'A11', parentId: 'A1', stufe: 'Serie', signatur: 'A 1.1', titel: 'Ratsprotokolle 1850-1899', entstehungszeitraum: '1850-1899', verzeichnungsstatus: 'Freigegeben', ablaufSchutzfrist: '1985-01-01', verwertungsrecht: 'Gemeinfrei', standortKuerzel: 'A.01.001' },
  { id: 'A11001', parentId: 'A11', stufe: 'Dossier', signatur: 'A 1.1-001', titel: 'Ratsprotokoll 1852 (Transkription)', entstehungszeitraum: '1852', verzeichnungsstatus: 'Freigegeben', ablaufSchutzfrist: '1982-01-01', verwertungsrecht: 'Gemeinfrei', standortKuerzel: 'A.01.001' },
  { id: 'A12', parentId: 'A1', stufe: 'Serie', signatur: 'A 1.2', titel: 'Beschlüsse 1950-1969', entstehungszeitraum: '1950-1969', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.002' },
  { id: 'A12004', parentId: 'A12', stufe: 'Dossier', signatur: 'A 1.2-004', titel: 'Strassenbauprojekt Seetalstrasse', entstehungszeitraum: '1954-1956', schutzfristJahre: 30, ablaufSchutzfrist: '1987-01-01', verzeichnungsstatus: 'Freigegeben', abgebendeStelle: 'Staatskanzlei', standortKuerzel: 'A.01.002', formInhalt: 'Beschlüsse, Landerwerbsakten, Pläne.' },
  { id: 'A12007', parentId: 'A12', stufe: 'Dossier', signatur: 'A 1.2-007', titel: 'Kantonsspital Erweiterungsbau', entstehungszeitraum: '1961-1965', schutzfristJahre: 30, ablaufSchutzfrist: '1996-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.002' },
  { id: 'A13', parentId: 'A1', stufe: 'Serie', signatur: 'A 1.3', titel: 'Beschlüsse 1970-1989', entstehungszeitraum: '1970-1989', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.002' },
  { id: 'A13001', parentId: 'A13', stufe: 'Dossier', signatur: 'A 1.3-001', titel: 'Gesamterneuerungswahlen 1978', entstehungszeitraum: '1978', schutzfristJahre: 30, ablaufSchutzfrist: '2009-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.002' },
  { id: 'A13012', parentId: 'A13', stufe: 'Dossier', signatur: 'A 1.3-012', titel: 'Kantonale Abstimmungen 1985', entstehungszeitraum: '1985', schutzfristJahre: 30, ablaufSchutzfrist: '2016-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.002' },
  { id: 'A14', parentId: 'A1', stufe: 'Serie', signatur: 'A 1.4', titel: 'Beschlüsse 1990-1999', entstehungszeitraum: '1990-1999', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.003' },
  { id: 'A14003', parentId: 'A14', stufe: 'Dossier', signatur: 'A 1.4-003', titel: 'Schulhausbauten Gemeinde Lindberg', entstehungszeitraum: '1990-1992', schutzfristJahre: 30, ablaufSchutzfrist: '2023-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.003' },
  { id: 'A14009', parentId: 'A14', stufe: 'Dossier', signatur: 'A 1.4-009', titel: 'Hochwasserschutz Dossibach', entstehungszeitraum: '1999-2001', schutzfristJahre: 30, ablaufSchutzfrist: '2032-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.003' },
  { id: 'A15', parentId: 'A1', stufe: 'Serie', signatur: 'A 1.5', titel: 'Beschlüsse 2000-2010', entstehungszeitraum: '2000-2010', verzeichnungsstatus: 'In Prüfung', standortKuerzel: 'A.01.003' },
  { id: 'A15002', parentId: 'A15', stufe: 'Dossier', signatur: 'A 1.5-002', titel: 'Verwaltungsreorganisation 2004', entstehungszeitraum: '2004-2005', schutzfristJahre: 30, ablaufSchutzfrist: '2036-01-01', verzeichnungsstatus: 'In Prüfung', standortKuerzel: 'A.01.003', akzessionId: 'akz1' },
  { id: 'A15011', parentId: 'A15', stufe: 'Dossier', signatur: 'A 1.5-011', titel: 'E-Government-Strategie', entstehungszeitraum: '2008-2012', schutzfristJahre: 30, ablaufSchutzfrist: '2043-01-01', verzeichnungsstatus: 'In Bearbeitung', standortKuerzel: 'A.01.003', akzessionId: 'akz1' },
  { id: 'A2', parentId: 'A', stufe: 'Bestand', signatur: 'A 2', titel: 'Baudirektion', entstehungszeitraum: '1920-2020', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p2', umfang: '188 Laufmeter', archivalienart: 'Akten, Pläne' },
  { id: 'A21', parentId: 'A2', stufe: 'Serie', signatur: 'A 2.1', titel: 'Kantonsstrassen', entstehungszeitraum: '1946-2020', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'B.01' },
  { id: 'A21005', parentId: 'A21', stufe: 'Dossier', signatur: 'A 2.1-005', titel: 'Umfahrung Lindberg, Projektierung', entstehungszeitraum: '2015-2023', schutzfristJahre: 30, ablaufSchutzfrist: '2054-01-01', verzeichnungsstatus: 'In Bearbeitung', standortKuerzel: 'B.01', akzessionId: 'akz2', formInhalt: 'Technische Berichte, Pläne, Mitwirkungsverfahren, Korrespondenz.' },
  { id: 'A22', parentId: 'A2', stufe: 'Serie', signatur: 'A 2.2', titel: 'Hochbauten', entstehungszeitraum: '1920-2010', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'B.01' },
  { id: 'A22002', parentId: 'A22', stufe: 'Dossier', signatur: 'A 2.2-002', titel: 'Kantonsschule Neubau 1972', entstehungszeitraum: '1968-1975', schutzfristJahre: 30, ablaufSchutzfrist: '2006-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'B.01' },
  { id: 'A3', parentId: 'A', stufe: 'Bestand', signatur: 'A 3', titel: 'Gesundheitsdirektion', entstehungszeitraum: '1940-2015', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p3', umfang: '96 Laufmeter' },
  { id: 'A31', parentId: 'A3', stufe: 'Serie', signatur: 'A 3.1', titel: 'Kantonsspital', entstehungszeitraum: '1940-2015', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.02' },
  { id: 'A31002', parentId: 'A31', stufe: 'Dossier', signatur: 'A 3.1-002', titel: 'Kantonsspital Jahresberichte', entstehungszeitraum: '1946-2010', schutzfristJahre: 30, ablaufSchutzfrist: '2018-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.02' },
  { id: 'A4', parentId: 'A', stufe: 'Bestand', signatur: 'A 4', titel: 'Kantonale Statistik', entstehungszeitraum: '1900-2020', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p1', umfang: '44 Laufmeter' },
  { id: 'A41', parentId: 'A4', stufe: 'Serie', signatur: 'A 4.1', titel: 'Statistische Erhebungen', entstehungszeitraum: '1900-2020', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.02' },
  { id: 'A41001', parentId: 'A41', stufe: 'Dossier', signatur: 'A 4.1-001', titel: 'Einwohnerzahlen 1950-2020', entstehungszeitraum: '1950-2020', ablaufSchutzfrist: '2021-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.02' },
  { id: 'A41004', parentId: 'A41', stufe: 'Dossier', signatur: 'A 4.1-004', titel: 'Steuerstatistik', entstehungszeitraum: '1990-2010', schutzfristJahre: 30, ablaufSchutzfrist: '2041-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.02' },
  { id: 'A9', parentId: 'A', stufe: 'Bestand', signatur: 'A 9', titel: 'Bewertung und Kassation', entstehungszeitraum: '1995-2026', verzeichnungsstatus: 'In Bearbeitung', umfang: '3 Laufmeter' },
  { id: 'A91', parentId: 'A9', stufe: 'Serie', signatur: 'A 9.1', titel: 'Kassationsentscheide', entstehungszeitraum: '1995-2026', verzeichnungsstatus: 'In Bearbeitung', standortKuerzel: 'A.02' },
  // --- B Gerichte und Notariat
  { id: 'B', parentId: null, stufe: 'Klassifikationsknoten', signatur: 'B', titel: 'Gerichte und Notariat', verzeichnungsstatus: 'Freigegeben' },
  { id: 'B1', parentId: 'B', stufe: 'Bestand', signatur: 'B 1', titel: 'Obergericht', entstehungszeitraum: '1900-2010', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p4', umfang: '142 Laufmeter', zugangsbestimmungen: 'Personendaten unterliegen verlängerten Schutzfristen.' },
  { id: 'B11', parentId: 'B1', stufe: 'Serie', signatur: 'B 1.1', titel: 'Zivilrechtliche Berufungen', entstehungszeitraum: '1950-2005', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.001' },
  { id: 'B11003', parentId: 'B11', stufe: 'Dossier', signatur: 'B 1.1-003', titel: 'Zivilrechtliche Berufungen 1995', entstehungszeitraum: '1995', schutzfristJahre: 50, ablaufSchutzfrist: '2046-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.001', zugangsbestimmungen: 'Schutzfrist 50 Jahre (besonders schützenswerte Personendaten).' },
  { id: 'B12', parentId: 'B1', stufe: 'Serie', signatur: 'B 1.2', titel: 'Verwaltungsgerichtsbeschwerden', entstehungszeitraum: '1980-2010', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.001' },
  { id: 'B12001', parentId: 'B12', stufe: 'Dossier', signatur: 'B 1.2-001', titel: 'Verwaltungsgerichtsbeschwerden 2001', entstehungszeitraum: '2001', schutzfristJahre: 50, ablaufSchutzfrist: '2052-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'A.01.001' },
  { id: 'B2', parentId: 'B', stufe: 'Bestand', signatur: 'B 2', titel: 'Notariat', entstehungszeitraum: '1860-1995', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p5', umfang: '78 Laufmeter' },
  { id: 'B21', parentId: 'B2', stufe: 'Serie', signatur: 'B 2.1', titel: 'Notariatsregister', entstehungszeitraum: '1860-1995', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'B21001', parentId: 'B21', stufe: 'Dossier', signatur: 'B 2.1-001', titel: 'Notariatskreis Dossikon-Stadt', entstehungszeitraum: '1860-1995', schutzfristJahre: 100, ablaufSchutzfrist: '2096-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  // --- C Private Archive und Nachlaesse
  { id: 'C', parentId: null, stufe: 'Klassifikationsknoten', signatur: 'C', titel: 'Private Archive und Nachlässe', verzeichnungsstatus: 'Freigegeben' },
  { id: 'C1', parentId: 'C', stufe: 'Bestand', signatur: 'C 1', titel: 'Familienarchiv Steinmann', entstehungszeitraum: '1780-1960', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p6', umfang: '12 Laufmeter', zugangsbestimmungen: 'Benutzung nur mit schriftlicher Bewilligung der Familie (Depositalvertrag 2019).' },
  { id: 'C11', parentId: 'C1', stufe: 'Serie', signatur: 'C 1.1', titel: 'Korrespondenz', entstehungszeitraum: '1820-1940', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'C11004', parentId: 'C11', stufe: 'Dossier', signatur: 'C 1.1-004', titel: 'Korrespondenz Familie Steinmann', entstehungszeitraum: '1890-1925', ablaufSchutzfrist: '2010-01-01', verwertungsrecht: 'Gemeinfrei', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'C2', parentId: 'C', stufe: 'Bestand', signatur: 'C 2', titel: 'Firmenarchiv Spinnerei Dossikon AG', entstehungszeitraum: '1872-1998', verzeichnungsstatus: 'In Bearbeitung', provenienzId: 'p7', umfang: '34 Laufmeter', akzessionId: 'akz6' },
  // --- D Sammlungen
  { id: 'D', parentId: null, stufe: 'Klassifikationsknoten', signatur: 'D', titel: 'Sammlungen', verzeichnungsstatus: 'Freigegeben' },
  { id: 'D1', parentId: 'D', stufe: 'Bestand', signatur: 'D 1', titel: 'Fotosammlung', entstehungszeitraum: '1880-2025', verzeichnungsstatus: 'Freigegeben', provenienzId: 'p8', umfang: 'ca. 18000 Aufnahmen' },
  { id: 'D11', parentId: 'D1', stufe: 'Serie', signatur: 'D 1.1', titel: 'Ortsansichten und Ereignisse', entstehungszeitraum: '1900-2025', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D11001', parentId: 'D11', stufe: 'Einzelstück', signatur: 'D 1.1-001', titel: 'Ortsansicht Dossikon um 1920', entstehungszeitraum: 'ca. 1920', ablaufSchutzfrist: '1990-01-01', verwertungsrecht: 'Gemeinfrei', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D11002', parentId: 'D11', stufe: 'Einzelstück', signatur: 'D 1.1-002', titel: 'Marktplatz Dossikon 1935', entstehungszeitraum: '1935', ablaufSchutzfrist: '2005-01-01', verwertungsrecht: 'Gemeinfrei', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D11003', parentId: 'D11', stufe: 'Einzelstück', signatur: 'D 1.1-003', titel: 'Bahnhofquartier 1948', entstehungszeitraum: '1948', ablaufSchutzfrist: '2018-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D11004', parentId: 'D11', stufe: 'Einzelstück', signatur: 'D 1.1-004', titel: 'Hochwasser Dossibach 1999', entstehungszeitraum: '1999', ablaufSchutzfrist: '2069-01-01', verwertungsrecht: 'Urheberrechtlich geschützt', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D11005', parentId: 'D11', stufe: 'Einzelstück', signatur: 'D 1.1-005', titel: 'Luftaufnahme Kantonsschule 1975', entstehungszeitraum: '1975', ablaufSchutzfrist: '2045-01-01', verwertungsrecht: 'Urheberrechtlich geschützt', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D11006', parentId: 'D11', stufe: 'Einzelstück', signatur: 'D 1.1-006', titel: 'Eröffnung Umfahrung Lindberg 2023', entstehungszeitraum: '2023', ablaufSchutzfrist: '2093-01-01', verwertungsrecht: 'Urheberrechtlich geschützt', verzeichnungsstatus: 'In Bearbeitung', standortKuerzel: 'K' },
  { id: 'D2', parentId: 'D', stufe: 'Bestand', signatur: 'D 2', titel: 'Karten und Pläne', entstehungszeitraum: '1798-2020', verzeichnungsstatus: 'Freigegeben', umfang: 'ca. 4500 Blätter' },
  { id: 'D21', parentId: 'D2', stufe: 'Serie', signatur: 'D 2.1', titel: 'Kartensammlung', entstehungszeitraum: '1798-2020', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D21001', parentId: 'D21', stufe: 'Einzelstück', signatur: 'D 2.1-001', titel: 'Kantonskarte Dossikon 1878', entstehungszeitraum: '1878', ablaufSchutzfrist: '1950-01-01', verwertungsrecht: 'Gemeinfrei', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D21002', parentId: 'D21', stufe: 'Einzelstück', signatur: 'D 2.1-002', titel: 'Übersichtsplan Dossikon-Stadt 1902', entstehungszeitraum: '1902', ablaufSchutzfrist: '1975-01-01', verwertungsrecht: 'Gemeinfrei', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
  { id: 'D21003', parentId: 'D21', stufe: 'Dossier', signatur: 'D 2.1-003', titel: 'Erschliessungsnotizen Kartensammlung', entstehungszeitraum: '2018-2024', verzeichnungsstatus: 'In Bearbeitung', standortKuerzel: 'K' },
  { id: 'D21004', parentId: 'D21', stufe: 'Einzelstück', signatur: 'D 2.1-004', titel: 'Gewässerkarte Dossibachtal 1955', entstehungszeitraum: '1955', ablaufSchutzfrist: '2026-01-01', verzeichnungsstatus: 'Freigegeben', standortKuerzel: 'K' },
];

const HIST = (id: string): { datum: string; benutzer: string; aktion: string }[] => [
  { datum: '2025-11-12 09:41', benutzer: 'm.zellweger', aktion: 'Objekt erstellt (Import aus Ingest)' },
  { datum: '2026-01-20 14:05', benutzer: 'r.baumann', aktion: 'Feld "Titel" geändert' },
  { datum: '2026-03-08 10:17', benutzer: 'm.zellweger', aktion: 'Verzeichnungsstatus gewechselt' },
];

// ============================================================ Magazin (fiktiv)
const MAGAZIN_SEED: MagazinObjekt[] = [
  { id: 'mA', parentId: null, kuerzel: 'A', bezeichnung: 'Hauptgebäude, Magazin A', kapazitaetLaufmeter: 1600, belegtLaufmeter: 1240 },
  { id: 'mA01', parentId: 'mA', kuerzel: 'A.01', bezeichnung: 'Untergeschoss 1', kapazitaetLaufmeter: 500, belegtLaufmeter: 420 },
  { id: 'mA01001', parentId: 'mA01', kuerzel: 'A.01.001', bezeichnung: 'Gestellreihe 1 (Rollgestell)', kapazitaetLaufmeter: 120, belegtLaufmeter: 98 },
  { id: 'mA01002', parentId: 'mA01', kuerzel: 'A.01.002', bezeichnung: 'Gestellreihe 2 (Rollgestell)', kapazitaetLaufmeter: 120, belegtLaufmeter: 110 },
  { id: 'mA01003', parentId: 'mA01', kuerzel: 'A.01.003', bezeichnung: 'Gestellreihe 3 (Rollgestell)', kapazitaetLaufmeter: 120, belegtLaufmeter: 87 },
  { id: 'mA02', parentId: 'mA', kuerzel: 'A.02', bezeichnung: 'Untergeschoss 2', kapazitaetLaufmeter: 600, belegtLaufmeter: 430 },
  { id: 'mB', parentId: null, kuerzel: 'B', bezeichnung: 'Aussenmagazin Lindberg', kapazitaetLaufmeter: 1200, belegtLaufmeter: 890 },
  { id: 'mB01', parentId: 'mB', kuerzel: 'B.01', bezeichnung: 'Halle 1', kapazitaetLaufmeter: 600, belegtLaufmeter: 510 },
  { id: 'mB02', parentId: 'mB', kuerzel: 'B.02', bezeichnung: 'Halle 2', kapazitaetLaufmeter: 600, belegtLaufmeter: 380 },
  { id: 'mK', parentId: null, kuerzel: 'K', bezeichnung: 'Kulturgüterschutzraum', kapazitaetLaufmeter: 300, belegtLaufmeter: 140 },
];

// ============================================================ Provenienzen (fiktiv)
const PROVENIENZ_SEED: Provenienz[] = [
  { id: 'p1', identifikatorNormdatei: 'PROV-001', name: 'Staatskanzlei des Kantons Dossikon', typ: 'Körperschaft', status: 'Abgeschlossen', geschichte: 'Stabsstelle des Regierungsrates seit 1848.', vorgaengerIds: [], nachfolgerIds: [], gndId: '2098765-4 (fiktiv)', letzterAbgleich: '2026-04-12' },
  { id: 'p2', identifikatorNormdatei: 'PROV-002', name: 'Baudirektion des Kantons Dossikon', typ: 'Körperschaft', status: 'Abgeschlossen', geschichte: 'Hervorgegangen aus dem Bau- und Planungsamt (bis 1968).', vorgaengerIds: ['p9'], nachfolgerIds: [], gndId: '2098766-2 (fiktiv)', letzterAbgleich: '2026-04-12' },
  { id: 'p3', identifikatorNormdatei: 'PROV-003', name: 'Gesundheitsdirektion des Kantons Dossikon', typ: 'Körperschaft', status: 'InPruefung', geschichte: 'Zuständig für das Gesundheitswesen inkl. Kantonsspital.', vorgaengerIds: [], nachfolgerIds: [] },
  { id: 'p4', identifikatorNormdatei: 'PROV-004', name: 'Obergericht des Kantons Dossikon', typ: 'Körperschaft', status: 'Abgeschlossen', geschichte: 'Oberste kantonale Gerichtsinstanz.', vorgaengerIds: [], nachfolgerIds: [], gndId: '2098767-0 (fiktiv)', letzterAbgleich: '2026-02-03' },
  { id: 'p5', identifikatorNormdatei: 'PROV-005', name: 'Notariat Dossikon-Stadt', typ: 'Körperschaft', status: 'Abgeschlossen', geschichte: 'Notariatskreis der Kantonshauptstadt, 1860-1995.', vorgaengerIds: [], nachfolgerIds: [] },
  { id: 'p6', identifikatorNormdatei: 'PROV-006', name: 'Familie Steinmann (Dossikon)', typ: 'Familie', status: 'Abgeschlossen', geschichte: 'Dossikoner Magistratenfamilie, 18.-20. Jahrhundert.', vorgaengerIds: [], nachfolgerIds: [], gndId: '119876543 (fiktiv)', letzterAbgleich: '2025-12-18' },
  { id: 'p7', identifikatorNormdatei: 'PROV-007', name: 'Spinnerei Dossikon AG', typ: 'Körperschaft', status: 'InBearbeitung', geschichte: 'Textilunternehmen 1872-1998, Konkurs 1998.', vorgaengerIds: [], nachfolgerIds: [] },
  { id: 'p8', identifikatorNormdatei: 'PROV-008', name: 'Brunner, Emil (Fotograf)', typ: 'Person', status: 'Abgeschlossen', geschichte: 'Fotoatelier in Dossikon, 1908-1962. Sein Atelierbestand bildet den Kern der Fotosammlung.', vorgaengerIds: [], nachfolgerIds: [], gndId: '118765432 (fiktiv)', letzterAbgleich: '2026-01-22' },
  { id: 'p9', identifikatorNormdatei: 'PROV-009', name: 'Bau- und Planungsamt des Kantons Dossikon', typ: 'Körperschaft', status: 'Abgeschlossen', geschichte: 'Vorgängerbehörde der Baudirektion, bis 1968.', vorgaengerIds: [], nachfolgerIds: ['p2'] },
];

// ============================================================ Akzessionen (fiktiv)
const AKZESSION_SEED: Akzession[] = [
  { id: 'akz1', akzessionsnummer: 'AKZ 2025/01', titel: 'Übernahme Staatskanzlei: RRB-Serie 2000-2010', status: 'Abgeschlossen', abgebendeStelle: 'Staatskanzlei des Kantons Dossikon', erwerbsart: 'Ablieferung (gesetzlich)', zustandskategorie: 'gut', entstehungszeitraum: '2000-2010', umfangLaufmeter: 18, uebernahmedatum: '2025-03-14', erstellteVeIds: ['A15002', 'A15011'] },
  { id: 'akz2', akzessionsnummer: 'AKZ 2025/04', titel: 'Baudirektion: Projektdossiers Umfahrung Lindberg', status: 'Abgeschlossen', abgebendeStelle: 'Baudirektion des Kantons Dossikon', erwerbsart: 'Ablieferung (gesetzlich)', zustandskategorie: 'gut', entstehungszeitraum: '2015-2023', umfangLaufmeter: 6, uebernahmedatum: '2025-09-02', erstellteVeIds: ['A21005'] },
  { id: 'akz3', akzessionsnummer: 'AKZ 2025/07', titel: 'Nachlass Prof. Dr. Huber (Historiker)', status: 'InBearbeitung', abgebendeStelle: 'Erbengemeinschaft Huber', erwerbsart: 'Schenkung', zustandskategorie: 'teilweise beschädigt', entstehungszeitraum: '1955-2020', umfangLaufmeter: 9, bemerkungen: 'Schimmelbefall in zwei Schachteln, Konservierung eingeleitet.', uebernahmedatum: '2025-11-20', erstellteVeIds: [] },
  { id: 'akz4', akzessionsnummer: 'AKZ 2026/02', titel: 'Fotosammlung: Ergänzung Atelier Brunner', status: 'InBearbeitung', abgebendeStelle: 'Privatbesitz (Fam. Brunner)', erwerbsart: 'Kauf', zustandskategorie: 'gut', entstehungszeitraum: '1930-1960', umfangLaufmeter: 2, uebernahmedatum: '2026-02-11', erstellteVeIds: [] },
  { id: 'akz5', akzessionsnummer: 'AKZ 2026/03', titel: 'Notariatsregister: Nachlieferung Kreis Seetal', status: 'InBearbeitung', abgebendeStelle: 'Obergericht des Kantons Dossikon', erwerbsart: 'Ablieferung (gesetzlich)', entstehungszeitraum: '1920-1990', umfangLaufmeter: 4, uebernahmedatum: '2026-03-05', erstellteVeIds: [] },
  { id: 'akz6', akzessionsnummer: 'AKZ 2026/05', titel: 'Firmenarchiv Spinnerei Dossikon AG (Depositum)', status: 'Abgeschlossen', abgebendeStelle: 'Nachlassverwaltung Spinnerei Dossikon AG', erwerbsart: 'Depositum', zustandskategorie: 'gut', entstehungszeitraum: '1872-1998', umfangLaufmeter: 34, uebernahmedatum: '2026-04-22', erstellteVeIds: ['C2'] },
];

// ============================================================ Ablieferungen (fiktiv)
const OK = (schritt: string, detail: string) => ({ schritt, resultat: 'ok' as const, detail });
const ABLIEFERUNG_SEED: Ablieferung[] = [
  {
    id: 'abl1', nummer: 'ABL-2026-001', titel: 'GEVER Staatskanzlei: Testablieferung', ablieferndeStelle: 'Staatskanzlei des Kantons Dossikon',
    status: 'bestätigt', eingangsdatum: '2026-02-17', sipFormat: 'eCH-0160 (arelda)', sipVersion: '1.3',
    validierungen: [
      OK('Ordnerstruktur prüfen', 'Top-Level-Struktur und header/metadata.xml vorhanden'),
      OK('metadata.xml gegen arelda-Schema validieren', 'Schema eCH-0160 v1.3, 0 Fehler'),
      OK('SHA-512-Prüfsummen vergleichen', '14 von 14 Dateien stimmen mit den Metadaten überein'),
      OK('Prefix-Regeln prüfen', 'Alle Pfade konform'),
    ],
  },
  {
    id: 'abl2', nummer: 'ABL-2026-002', titel: 'Gemeindefusion Seetal: Aussonderung angekündigt', ablieferndeStelle: 'Gemeinde Seetal',
    status: 'ausgesondert', eingangsdatum: '2026-03-28', sipFormat: 'eCH-0160 (arelda)', sipVersion: '1.3',
    validierungen: [
      { schritt: 'Ordnerstruktur prüfen', resultat: 'ausstehend', detail: 'SIP noch nicht eingegangen (Aussonderung beim Aktenbildner läuft)' },
      { schritt: 'metadata.xml gegen arelda-Schema validieren', resultat: 'ausstehend', detail: '-' },
      { schritt: 'SHA-512-Prüfsummen vergleichen', resultat: 'ausstehend', detail: '-' },
    ],
  },
  {
    id: 'abl3', nummer: 'ABL-2026-003', titel: 'RRB-Serie 2000-2010', ablieferndeStelle: 'Staatskanzlei des Kantons Dossikon',
    status: 'bestätigt', eingangsdatum: '2026-04-30', sipFormat: 'eCH-0160 (arelda)', sipVersion: '1.3',
    sipDateiId: 'sip1', quittungDateiId: 'quit1',
    validierungen: [
      OK('Ordnerstruktur prüfen', 'Top-Level-Struktur und header/metadata.xml vorhanden'),
      OK('metadata.xml gegen arelda-Schema validieren', 'Schema eCH-0160 v1.3, 0 Fehler'),
      OK('SHA-512-Prüfsummen vergleichen', '2 von 2 Dateien stimmen mit den Metadaten überein'),
      OK('Prefix-Regeln prüfen', 'Alle Pfade konform'),
    ],
  },
  {
    id: 'abl4', nummer: 'ABL-2026-004', titel: 'Gesundheitsdirektion: Jahresberichte 2011-2015', ablieferndeStelle: 'Gesundheitsdirektion des Kantons Dossikon',
    status: 'in Verarbeitung', eingangsdatum: '2026-05-19', sipFormat: 'eCH-0160 (arelda)', sipVersion: '1.0',
    validierungen: [
      OK('SIP-Version erkennen und transformieren', 'Version 1.0 erkannt, Transformation nach 1.3 durchgeführt'),
      OK('Ordnerstruktur prüfen', 'Top-Level-Struktur und header/metadata.xml vorhanden'),
      OK('metadata.xml gegen arelda-Schema validieren', 'Schema eCH-0160 v1.3, 0 Fehler'),
      { schritt: 'SHA-512-Prüfsummen vergleichen', resultat: 'fehler', detail: 'jahresbericht_2013.pdf: Digest stimmt nicht mit Metadaten überein. Korrekturlieferung angefordert (inkrementelle Wiederaufnahme möglich).' },
    ],
  },
  {
    id: 'abl5', nummer: 'ABL-2026-005', titel: 'Projektdossiers Umfahrung Lindberg', ablieferndeStelle: 'Baudirektion des Kantons Dossikon',
    status: 'bestätigt', eingangsdatum: '2026-05-02', sipFormat: 'eCH-0160 (arelda)', sipVersion: '1.3',
    sipDateiId: 'sip2', quittungDateiId: 'quit2',
    validierungen: [
      OK('Ordnerstruktur prüfen', 'Top-Level-Struktur und header/metadata.xml vorhanden'),
      OK('metadata.xml gegen arelda-Schema validieren', 'Schema eCH-0160 v1.3, 0 Fehler'),
      OK('SHA-512-Prüfsummen vergleichen', '3 von 3 Dateien stimmen mit den Metadaten überein'),
      OK('Prefix-Regeln prüfen', 'Alle Pfade konform'),
    ],
  },
];

const IMPORT_DATEIEN: ImportDatei[] = [
  { dateiname: 'SIP_20260430_STA_1.zip', datum: '2026-05-01 06:15', status: 'Success', log: 'Import abgeschlossen, 12 VE erstellt, Quittung erzeugt' },
  { dateiname: 'SIP_20260502_BAU_1.zip', datum: '2026-05-02 06:15', status: 'Success', log: 'Import abgeschlossen, 5 VE erstellt, Quittung erzeugt' },
  { dateiname: 'SIP_20260519_GD_1.zip', datum: '2026-05-19 06:15', status: 'Bad', log: 'SHA-512-Abweichung bei jahresbericht_2013.pdf, in Bad-Ordner verschoben, Mail an Administrator versandt' },
  { dateiname: 'ead_export_gemeinde_seetal.xml', datum: '2026-06-02 06:15', status: 'Manuell', log: 'EAD-Struktur unklar (mehrdeutiger Parent), manuelle Prüfung erforderlich' },
  { dateiname: 'SIP_20260708_STK_2.zip', datum: '2026-07-08 06:15', status: 'in Verarbeitung', log: 'Validierung läuft (Schritt 2 von 4)' },
];

// ============================================================ Verarbeitung (fiktiv)
const TASK_SEED: AblaufTask[] = [
  { id: 't-pass', name: 'Dossiers aus GEVER auskoppeln', beschreibung: 'Koppelt abgeschlossene Dossiers nach Ablauf der Karenzphase aus dem Quellsystem aus (Passivierung).', parameter: ['Quellsystem', 'Ordnungssystem-Position'] },
  { id: 't-sipbild', name: 'SIP bilden (eCH-0160)', beschreibung: 'Erzeugt aus den ausgekoppelten Unterlagen ein Submission Information Package nach eCH-0160 inkl. SHA-512-Fixity.', parameter: ['SIP-Version', 'Prefix'] },
  { id: 't-sub', name: 'Submission-Paket (SIP) entgegennehmen', beschreibung: 'Nimmt ein SIP über Upload, FTP-Ordner oder REST-Schnittstelle entgegen.', parameter: ['Quelle (Upload/FTP/REST)'] },
  { id: 't-val', name: 'SIP validieren', beschreibung: 'Prüft Ordnerstruktur (header/metadata.xml), validiert metadata.xml gegen das arelda-Schema (eCH-0160) und vergleicht SHA-512-Prüfsummen.', parameter: ['Schema-Version', 'Abbruch bei Fehler'] },
  { id: 't-trans', name: 'SIP-Version transformieren', beschreibung: 'Erkennt die SIP-Version und transformiert bei Bedarf zwischen eCH-0160 1.0 und 1.3.', parameter: ['Zielversion'] },
  { id: 't-premis', name: 'PREMIS erfassen (FIDO)', beschreibung: 'Erhebt technische Metadaten je Datei: Format (Name/Version/Registry), Fixity (Algorithmus + Digest), Grösse, Originalname.', parameter: ['Hash-Algorithmus'] },
  { id: 't-aip', name: 'AIP bilden', beschreibung: 'Bildet aus validiertem SIP und Metadaten das Archival Information Package inkl. Erhaltungsmetadaten.', parameter: ['Granularität (pro VE, mit/ohne Kinder)'] },
  { id: 't-store', name: 'Storage: AIP ablegen', beschreibung: 'Übergibt das AIP ans Repository und persistiert die zurückgegebene PID am Objekt.', parameter: ['Repository', 'Zielordner'] },
  { id: 't-import', name: 'Import in Tektonik (XSLT-Crosswalk)', beschreibung: 'Mappt eCH-0160/EAD auf das ISAD(G)-Modell und hängt die VE-Hierarchie unter dem passenden Parent ein.', parameter: ['Mapping-XSLT', 'Ziel-Position'] },
  { id: 't-quit', name: 'Ablieferungsquittung erzeugen', beschreibung: 'Erzeugt den Übernahmenachweis für die abliefernde Stelle als PDF.', parameter: [] },
  { id: 't-doc', name: 'Document Service: Rendition erzeugen', beschreibung: 'Erzeugt archivische Nutzungsformen (Renditionen) aus den Originaldateien.', parameter: ['Zielformat'] },
  { id: 't-fix', name: 'Fixity-Prüfung', beschreibung: 'Berechnet SHA-512 je Archivdatei neu und vergleicht mit dem gespeicherten Digest (Bitrot-Erkennung).', parameter: ['Umfang (alle/Stichprobe)'] },
  { id: 't-mail', name: 'Mail: Benachrichtigung versenden', beschreibung: 'Versendet Benachrichtigungen bei Erfolg oder Fehler an die konfigurierten Empfänger.', parameter: ['Empfänger', 'Bei Erfolg/Fehler'] },
  { id: 't-log', name: 'Log: Protokoll schreiben', beschreibung: 'Schreibt den Ablauf-Verlauf ins zentrale Protokoll (Cockpit-Sicht).', parameter: [] },
];

const WORKFLOW_SEED = [
  { id: 'wf1', code: 'I-25', name: 'SIP', typ: 'Ingest' as AusfuehrungsTyp, version: 3, beschreibung: 'Standard-Ingest: SIP entgegennehmen, validieren, PREMIS erheben, AIP bilden, ablegen, in Tektonik importieren, quittieren.', schritte: [{ taskId: 't-sub' }, { taskId: 't-val' }, { taskId: 't-premis' }, { taskId: 't-aip' }, { taskId: 't-store' }, { taskId: 't-import', parameter: 'XSLT: eCH-0160 zu ISAD(G) Standard' }, { taskId: 't-quit' }, { taskId: 't-mail', parameter: 'Bei Erfolg und Fehler' }, { taskId: 't-log' }] },
  { id: 'wf2', code: 'I-12', name: 'EAD-Import Docuteam', typ: 'Ingest' as AusfuehrungsTyp, version: 1, beschreibung: 'Import aus Docuteam Feeder/Box via EAD-Crosswalk.', schritte: [{ taskId: 't-sub', parameter: 'Quelle: REST (Docuteam)' }, { taskId: 't-import', parameter: 'XSLT: EAD zu Modell' }, { taskId: 't-log' }] },
  { id: 'wf3', code: 'P-325', name: 'Regierung', typ: 'Passivierung' as AusfuehrungsTyp, version: 2, beschreibung: 'Passivierung der Regierungsgeschäfte: Dossiers auskoppeln und SIP bilden.', schritte: [{ taskId: 't-pass', parameter: 'Quellsystem: GEVER Staatskanzlei' }, { taskId: 't-sipbild', parameter: 'eCH-0160 v1.3' }, { taskId: 't-mail' }, { taskId: 't-log' }] },
  { id: 'wf4', code: 'A-725', name: 'PDF Konv', typ: 'Preservation' as AusfuehrungsTyp, version: 1, beschreibung: 'Erhaltungsmassnahme Formatmigration: Renditionen als PDF erzeugen, PREMIS nachführen.', schritte: [{ taskId: 't-doc', parameter: 'Zielformat: PDF' }, { taskId: 't-premis' }, { taskId: 't-log' }] },
  { id: 'wf5', code: 'R-110', name: 'Fixity-Prüfung', typ: 'Preservation' as AusfuehrungsTyp, version: 2, beschreibung: 'Periodische Integritätsprüfung des Repository-Bestands (SHA-512-Abgleich).', schritte: [{ taskId: 't-fix', parameter: 'Umfang: alle AIPs' }, { taskId: 't-mail', parameter: 'Nur bei Abweichung' }, { taskId: 't-log' }] },
];

const STEP = (name: string, status: Ausfuehrung['status'], log: string[]) => ({ name, status, log });
const AUSFUEHRUNG_SEED: Ausfuehrung[] = [
  {
    id: 'ax1', nr: 2, objekt: 'SIP_20260430_STA_1.zip', workflowCode: 'I-25', workflowName: 'I-25 SIP', typ: 'Ingest',
    status: 'fertig', zeitpunkt: '2026-05-01, 06.15 Uhr', dauer: '00:05:15',
    schritte: [
      STEP('Submission-Paket (SIP) entgegennehmen', 'fertig', ['06:15:02 SIP aus FTP-Ordner übernommen (2.1 MB)']),
      STEP('SIP validieren', 'fertig', ['06:15:11 Ordnerstruktur ok', '06:15:12 arelda-Schema ok (eCH-0160 v1.3)', '06:15:40 SHA-512: 2/2 Dateien ok']),
      STEP('PREMIS erfassen (FIDO)', 'fertig', ['06:16:03 2 Dateien identifiziert (PRONOM)']),
      STEP('AIP bilden', 'fertig', ['06:16:31 AIP gebildet (Granularität: pro VE)']),
      STEP('Storage: AIP ablegen', 'fertig', ['06:17:10 PID STA-AIP-2026-0031 vergeben']),
      STEP('Import in Tektonik (XSLT-Crosswalk)', 'fertig', ['06:18:22 12 VE unter A 1.5 eingehängt']),
      STEP('Ablieferungsquittung erzeugen', 'fertig', ['06:19:04 Quittung ABL-2026-003 erzeugt']),
      STEP('Mail: Benachrichtigung versenden', 'fertig', ['06:19:06 Mail an ingest@sta.dk.ch']),
      STEP('Log: Protokoll schreiben', 'fertig', ['06:20:17 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax2', nr: 5, objekt: 'REG_20260304', workflowCode: 'P-325', workflowName: 'P-325 Regierung', typ: 'Passivierung',
    status: 'fertig', zeitpunkt: '2026-03-04, 22.00 Uhr', dauer: '00:41:08',
    schritte: [
      STEP('Dossiers aus GEVER auskoppeln', 'fertig', ['22:00:10 84 Dossiers nach Karenzphase ausgekoppelt']),
      STEP('SIP bilden (eCH-0160)', 'fertig', ['22:31:44 SIP mit SHA-512-Fixity gebildet']),
      STEP('Mail: Benachrichtigung versenden', 'fertig', ['22:41:00 Mail an staatskanzlei@dk.ch']),
      STEP('Log: Protokoll schreiben', 'fertig', ['22:41:08 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax3', nr: 3, objekt: 'PDF/A', workflowCode: 'A-725', workflowName: 'A-725 PDF Konv', typ: 'Preservation',
    status: 'fertig', zeitpunkt: '2026-06-12, 03.00 Uhr', dauer: '01:12:40',
    schritte: [
      STEP('Document Service: Rendition erzeugen', 'fertig', ['03:00:05 3 Renditionen erzeugt (dok_01, dok_02, dok_05)']),
      STEP('PREMIS erfassen (FIDO)', 'fertig', ['04:05:12 Formatmigration als PREMIS-Event dokumentiert']),
      STEP('Log: Protokoll schreiben', 'fertig', ['04:12:40 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax4', nr: 2, objekt: 'SIP_20260502_BAU_1.zip', workflowCode: 'I-25', workflowName: 'I-25 SIP', typ: 'Ingest',
    status: 'fertig', zeitpunkt: '2026-05-02, 06.15 Uhr', dauer: '00:04:41',
    schritte: [
      STEP('Submission-Paket (SIP) entgegennehmen', 'fertig', ['06:15:01 SIP aus FTP-Ordner übernommen']),
      STEP('SIP validieren', 'fertig', ['06:15:30 Struktur, Schema und SHA-512 ok']),
      STEP('PREMIS erfassen (FIDO)', 'fertig', ['06:16:00 3 Dateien identifiziert']),
      STEP('AIP bilden', 'fertig', ['06:16:20 AIP gebildet']),
      STEP('Storage: AIP ablegen', 'fertig', ['06:17:00 PID STA-AIP-2026-0044 vergeben']),
      STEP('Import in Tektonik (XSLT-Crosswalk)', 'fertig', ['06:18:00 5 VE unter A 2.1 eingehängt']),
      STEP('Ablieferungsquittung erzeugen', 'fertig', ['06:18:30 Quittung ABL-2026-005 erzeugt']),
      STEP('Mail: Benachrichtigung versenden', 'fertig', ['06:18:35 Mail versandt']),
      STEP('Log: Protokoll schreiben', 'fertig', ['06:19:42 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax5', nr: 7, objekt: 'SIP_20260519_GD_1.zip', workflowCode: 'I-25', workflowName: 'I-25 SIP', typ: 'Ingest',
    status: 'fehlgeschlagen', zeitpunkt: '2026-05-19, 06.15 Uhr', dauer: '00:01:12',
    schritte: [
      STEP('Submission-Paket (SIP) entgegennehmen', 'fertig', ['06:15:01 SIP aus FTP-Ordner übernommen']),
      STEP('SIP validieren', 'fehlgeschlagen', ['06:15:28 Ordnerstruktur ok', '06:15:30 arelda-Schema ok', '06:16:10 FEHLER SHA-512: jahresbericht_2013.pdf weicht von den Metadaten ab', '06:16:12 Abbruch, SIP in Bad-Ordner verschoben']),
      STEP('PREMIS erfassen (FIDO)', 'abgebrochen', []),
      STEP('AIP bilden', 'abgebrochen', []),
      STEP('Storage: AIP ablegen', 'abgebrochen', []),
      STEP('Import in Tektonik (XSLT-Crosswalk)', 'abgebrochen', []),
      STEP('Ablieferungsquittung erzeugen', 'abgebrochen', []),
      STEP('Mail: Benachrichtigung versenden', 'fertig', ['06:16:14 Fehler-Mail an Administrator versandt']),
      STEP('Log: Protokoll schreiben', 'fertig', ['06:16:15 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax6', nr: 4, objekt: 'Repository-Bestand (58 AIPs)', workflowCode: 'R-110', workflowName: 'R-110 Fixity-Prüfung', typ: 'Preservation',
    status: 'fertig', zeitpunkt: '2026-06-30, 02.00 Uhr', dauer: '02:20:33',
    schritte: [
      STEP('Fixity-Prüfung', 'fertig', ['02:00:04 58 AIPs geprüft', '04:15:00 0 Abweichungen (kein Bitrot festgestellt)']),
      STEP('Mail: Benachrichtigung versenden', 'fertig', ['04:15:02 Keine Abweichung, keine Mail (nur bei Abweichung konfiguriert)']),
      STEP('Log: Protokoll schreiben', 'fertig', ['04:20:33 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax7', nr: 6, objekt: 'REG_20260601', workflowCode: 'P-325', workflowName: 'P-325 Regierung', typ: 'Passivierung',
    status: 'abgebrochen', zeitpunkt: '2026-06-01, 22.00 Uhr', dauer: '00:02:50',
    schritte: [
      STEP('Dossiers aus GEVER auskoppeln', 'abgebrochen', ['22:00:10 Quellsystem nicht erreichbar (Wartungsfenster)', '22:02:50 Durch Administrator abgebrochen, Kompensation ausgeführt']),
      STEP('SIP bilden (eCH-0160)', 'abgebrochen', []),
      STEP('Mail: Benachrichtigung versenden', 'fertig', ['22:02:52 Abbruch-Mail versandt']),
      STEP('Log: Protokoll schreiben', 'fertig', ['22:02:53 Protokoll abgeschlossen']),
    ],
  },
  {
    id: 'ax8', nr: 8, objekt: 'SIP_20260708_STK_2.zip', workflowCode: 'I-25', workflowName: 'I-25 SIP', typ: 'Ingest',
    status: 'laufend', zeitpunkt: '2026-07-08, 06.15 Uhr', dauer: 'läuft',
    schritte: [
      STEP('Submission-Paket (SIP) entgegennehmen', 'fertig', ['06:15:02 SIP aus FTP-Ordner übernommen']),
      STEP('SIP validieren', 'laufend', ['06:15:20 Ordnerstruktur ok', '06:15:22 arelda-Schema wird geprüft']),
      STEP('PREMIS erfassen (FIDO)', 'wartend', []),
      STEP('AIP bilden', 'wartend', []),
      STEP('Storage: AIP ablegen', 'wartend', []),
      STEP('Import in Tektonik (XSLT-Crosswalk)', 'wartend', []),
      STEP('Ablieferungsquittung erzeugen', 'wartend', []),
      STEP('Mail: Benachrichtigung versenden', 'wartend', []),
      STEP('Log: Protokoll schreiben', 'wartend', []),
    ],
  },
  {
    id: 'ax9', nr: 5, objekt: 'Formatmigration Kandidaten Q3', workflowCode: 'A-725', workflowName: 'A-725 PDF Konv', typ: 'Preservation',
    status: 'wartend', zeitpunkt: '2026-07-15, 03.00 Uhr (geplant)', dauer: '-',
    schritte: [
      STEP('Document Service: Rendition erzeugen', 'wartend', []),
      STEP('PREMIS erfassen (FIDO)', 'wartend', []),
      STEP('Log: Protokoll schreiben', 'wartend', []),
    ],
  },
];

// ============================================================ Formatrisiken
// Bewertung je Format (D6-F-16: Risiken je Objekt/Format, Strategien
// Migration/Emulation/Monitoring). Einstufung: proprietaere/verlinkende
// Formate hoeher, offene Standards tiefer.
const FORMAT_RISIKEN: FormatRisiko[] = [
  { extension: 'pdf', formatName: 'Acrobat PDF 1.7', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Offener Standard (ISO 32000), langzeitstabil; Migration nach PDF/A bei Bedarf.' },
  { extension: 'docx', formatName: 'Microsoft Word (.docx)', risiko: 'mittel', strategie: 'Migration', begruendung: 'Proprietär geprägtes Format; archivische Nutzungsform als PDF-Rendition erzeugen.' },
  { extension: 'eml', formatName: 'Internet Message Format', risiko: 'mittel', strategie: 'Migration', begruendung: 'E-Mail mit möglichen externen Bezügen; Rendition inkl. Anhänge empfohlen.' },
  { extension: 'xlsx', formatName: 'Microsoft Excel (.xlsx)', risiko: 'mittel', strategie: 'Migration', begruendung: 'Formeln/Verknüpfungen gefährden die Nachvollziehbarkeit; CSV/PDF-Rendition prüfen.' },
  { extension: 'tif', formatName: 'Tagged Image File Format', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Etabliertes Archivformat für Bilddigitalisate.' },
  { extension: 'png', formatName: 'Portable Network Graphics', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Offener Standard, verlustfrei.' },
  { extension: 'csv', formatName: 'Comma Separated Values', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Einfaches, offenes Textformat.' },
  { extension: 'xml', formatName: 'Extensible Markup Language', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Offener Standard; Schema-Dokumentation mitarchivieren.' },
  { extension: 'json', formatName: 'JSON', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Offener Standard (Erhaltungsmetadaten).' },
  { extension: 'txt', formatName: 'Plain Text', risiko: 'tief', strategie: 'Monitoring', begruendung: 'Langzeitstabil; Zeichencodierung dokumentieren.' },
  { extension: 'zip', formatName: 'ZIP', risiko: 'mittel', strategie: 'Monitoring', begruendung: 'Containerformat (SIP-Pakete); Inhalt einzeln bewerten.' },
];

@Injectable({ providedIn: 'root' })
export class ArchivDataService {
  // ------------------------------------------------------------ state signals
  private readonly _ves = signal<Verzeichnungseinheit[]>(VE_SEED.map((v) => ({ ...v, historie: HIST(v.id) })));
  private readonly _akzessionen = signal<Akzession[]>(structuredClone(AKZESSION_SEED));
  private readonly _ausfuehrungen = signal<Ausfuehrung[]>(structuredClone(AUSFUEHRUNG_SEED));

  readonly ves = this._ves.asReadonly();
  readonly akzessionen = this._akzessionen.asReadonly();
  readonly ausfuehrungen = this._ausfuehrungen.asReadonly();

  readonly magazinObjekte = MAGAZIN_SEED;
  readonly provenienzen = PROVENIENZ_SEED;
  readonly ablieferungen = ABLIEFERUNG_SEED;
  readonly importDateien = IMPORT_DATEIEN;
  readonly tasks = TASK_SEED;
  readonly workflows = WORKFLOW_SEED;
  readonly formatRisiken = FORMAT_RISIKEN;
  readonly dateien: ArchivDatei[] = FILE_MANIFEST;

  // ------------------------------------------------------------ Tektonik helpers
  veById(id: string): Verzeichnungseinheit | undefined {
    return this._ves().find((v) => v.id === id);
  }

  children(parentId: string | null): Verzeichnungseinheit[] {
    return this._ves().filter((v) => v.parentId === parentId);
  }

  /** Tektonikpfad (D1-F-17): Signaturen entlang der Parent-Kette. */
  tektonikpfad(ve: Verzeichnungseinheit): string {
    const parts: string[] = [];
    let cur: Verzeichnungseinheit | undefined = ve;
    while (cur) {
      parts.unshift(`${cur.signatur} ${cur.titel}`);
      cur = cur.parentId ? this.veById(cur.parentId) : undefined;
    }
    return parts.join(' / ');
  }

  /**
   * Benutzbarkeit nach der D1-Regel:
   * Blatt: ohne Ablauf Schutzfrist -> Gesuchspflichtig; Ablauf in Vergangenheit ->
   * Frei einsehbar; Ablauf in Zukunft -> Gesuchspflichtig.
   * Eltern: Aggregation der Kinder; uneinheitlich -> Teilweise gesuchspflichtig.
   * Klassifikationsknoten werden bei der Aggregation übersprungen (Kinder zählen).
   */
  benutzbarkeit(ve: Verzeichnungseinheit): Benutzbarkeit {
    const kids = this.children(ve.id);
    if (kids.length === 0) {
      if (!ve.ablaufSchutzfrist) return 'Gesuchspflichtig';
      return ve.ablaufSchutzfrist <= '2026-07-10' ? 'Frei einsehbar' : 'Gesuchspflichtig';
    }
    const kidStates = kids.map((k) => this.benutzbarkeit(k));
    const frei = kidStates.every((s) => s === 'Frei einsehbar');
    const gesuch = kidStates.every((s) => s === 'Gesuchspflichtig');
    if (frei) return 'Frei einsehbar';
    if (gesuch) return 'Gesuchspflichtig';
    return 'Teilweise gesuchspflichtig';
  }

  filesForVe(signatur: string): ArchivDatei[] {
    return this.dateien.filter((d) => d.veSignatur === signatur);
  }

  fileById(id: string | undefined): ArchivDatei | undefined {
    return id ? this.dateien.find((d) => d.id === id) : undefined;
  }

  updateVeField(id: string, field: 'titel' | 'signatur' | 'entstehungszeitraum', value: string): void {
    this._ves.update((list) =>
      list.map((v) =>
        v.id === id
          ? {
              ...v,
              [field]: value,
              historie: [...v.historie, { datum: '2026-07-10 (heute)', benutzer: 'm.weingartner', aktion: `Feld "${field}" im Grid geändert` }],
            }
          : v,
      ),
    );
  }

  addVe(ve: Verzeichnungseinheit): void {
    this._ves.update((list) => [...list, ve]);
  }

  // ------------------------------------------------------------ Akzession actions
  /** Statuswechsel (D2-F-3); Wiedereroeffnen setzt Recht AkzessionenWiedereroeffnen voraus. */
  toggleAkzessionStatus(id: string): void {
    this._akzessionen.update((list) =>
      list.map((a) =>
        a.id === id ? { ...a, status: a.status === 'Abgeschlossen' ? 'InBearbeitung' : 'Abgeschlossen' } : a,
      ),
    );
  }

  /** Aus Akzession eine VE erstellen (D2-F-2): Felder übernehmen, Cross-Link setzen. */
  veAusAkzession(akzId: string): Verzeichnungseinheit | null {
    const akz = this._akzessionen().find((a) => a.id === akzId);
    if (!akz) return null;
    const id = `ve-akz-${akzId}-${this._ves().length}`;
    const ve: Verzeichnungseinheit = {
      id,
      parentId: 'A9',
      stufe: 'Dossier',
      signatur: `A 9.2-${String(this._ves().length).padStart(3, '0')}`,
      titel: akz.titel,
      entstehungszeitraum: akz.entstehungszeitraum,
      abgebendeStelle: akz.abgebendeStelle,
      verzeichnungsstatus: 'In Bearbeitung',
      akzessionId: akz.id,
      historie: [{ datum: '2026-07-10 (heute)', benutzer: 'm.weingartner', aktion: `Aus Akzession ${akz.akzessionsnummer} erstellt (Feldübernahme)` }],
    };
    this._ves.update((list) => [...list, ve]);
    this._akzessionen.update((list) =>
      list.map((a) => (a.id === akzId ? { ...a, erstellteVeIds: [...a.erstellteVeIds, id] } : a)),
    );
    return ve;
  }

  // ------------------------------------------------------------ Verarbeitung actions
  /** Erneut starten (D9-F-4): nur fehlgeschlagene Ketten, wiederaufnehmbar. */
  ausfuehrungErneutStarten(id: string): void {
    this._ausfuehrungen.update((list) =>
      list.map((a) => {
        if (a.id !== id || a.status !== 'fehlgeschlagen') return a;
        return {
          ...a,
          status: 'laufend',
          dauer: 'läuft',
          zeitpunkt: '2026-07-10 (heute), erneut gestartet',
          schritte: a.schritte.map((s) =>
            s.status === 'fehlgeschlagen' || s.status === 'abgebrochen'
              ? { ...s, status: 'wartend', log: [...s.log, 'Wiederaufnahme nach Korrektur (erneut gestartet)'] }
              : s,
          ),
        };
      }),
    );
  }

  // ------------------------------------------------------------ Magazin helpers
  magazinChildren(parentId: string | null): MagazinObjekt[] {
    return this.magazinObjekte.filter((m) => m.parentId === parentId);
  }

  vesAmStandort(kuerzel: string): Verzeichnungseinheit[] {
    return this._ves().filter((v) => v.standortKuerzel === kuerzel);
  }

  /**
   * Standort-Kuerzel-Validierung (MOBJ101-105): Pflicht, beginnt mit
   * Parent-Kuerzel, laenger als Parent, eindeutig unter Geschwistern.
   */
  validateKuerzel(kuerzel: string, parent: MagazinObjekt | null): string[] {
    const errors: string[] = [];
    if (!kuerzel) errors.push('MOBJ104: Kürzel ist Pflicht');
    if (parent) {
      if (!kuerzel.startsWith(parent.kuerzel)) errors.push(`MOBJ103: Kürzel muss mit dem Parent-Kürzel "${parent.kuerzel}" beginnen`);
      if (kuerzel.length <= parent.kuerzel.length) errors.push('MOBJ101: Kürzel muss länger als das Parent-Kürzel sein');
      const siblings = this.magazinChildren(parent.id);
      if (siblings.some((s) => s.kuerzel === kuerzel)) errors.push('MOBJ105: Kürzel ist unter den Geschwistern nicht eindeutig');
    }
    return errors;
  }

  provenienzById(id: string | undefined): Provenienz | undefined {
    return id ? this.provenienzen.find((p) => p.id === id) : undefined;
  }

  // ------------------------------------------------------------ Aggregationen
  readonly extensionStats = computed(() => {
    const map = new Map<string, number>();
    for (const d of this.dateien) map.set(d.extension, (map.get(d.extension) ?? 0) + 1);
    return [...map.entries()].map(([extension, count]) => ({ extension, count })).sort((a, b) => a.extension.localeCompare(b.extension));
  });

  readonly totalBytes = computed(() => this.dateien.reduce((s, d) => s + d.sizeBytes, 0));
}
